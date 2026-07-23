/**
 * CpeAuthenticator — handles CPE device authentication, session lifecycle,
 * and serialized request locking.
 *
 * Extracted from CpeClient to enforce Single Responsibility Principle.
 */
import {
  clearCpeSession,
  loadCpeSession,
  saveCpeSession,
  type PersistedCpeSession,
} from './cpe-session-store';
import {
  buildXmlRequest,
  decodeHtmlEntities,
  extractXmlTag,
  isCpeAuthenticationFailure,
} from './cpe-protocol';
import { fetchCpe } from './cpe-http';
import { computeClientProof, generateHexNonce, rsaEncryptValue } from './cpe-crypto';
import {
  buildCpeSessionHeaders,
  buildCpeTokenHeaders,
  CPE_INIT_HEADERS,
  CPE_USER_AGENT,
} from './cpe-headers';

export type CpeSession = PersistedCpeSession;

const SESSION_PERSIST_INTERVAL = 5 * 60 * 1000;
const RECENT_LOGIN_GUARD_MS = 5 * 1000;

export interface CpePostResult {
  status: number;
  text: string;
  sessionId: string;
}

export class CpeAuthenticator {
  private baseUrl: string;
  private username: string;
  private password: string;
  private session: CpeSession | null = null;
  private loginPromise: Promise<boolean> | null = null;
  private requestQueue: Promise<void> = Promise.resolve();
  private lastLoginError = '';
  private lastSessionPersistAt = 0;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
    this.session = loadCpeSession(baseUrl, username);
    this.lastSessionPersistAt = this.session?.lastUsedAt || 0;
  }

  matchesCredentials(baseUrl: string, username: string, password: string): boolean {
    return this.baseUrl === baseUrl
      && this.username === username
      && this.password === password;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getSession(): CpeSession | null {
    return this.session;
  }

  isSessionValid(): boolean {
    return Boolean(this.session);
  }

  persistSession(force = false): void {
    if (!this.session) return;
    const now = Date.now();
    this.session.lastUsedAt = now;
    if (!force && now - this.lastSessionPersistAt < SESSION_PERSIST_INTERVAL) return;
    saveCpeSession(this.baseUrl, this.username, this.session);
    this.lastSessionPersistAt = now;
  }

  invalidateSession(): void {
    this.session = null;
    this.lastSessionPersistAt = 0;
    clearCpeSession();
  }

  async withRequestLock<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.requestQueue;
    let release!: () => void;
    this.requestQueue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }

  async relogin(staleSessionId?: string): Promise<boolean> {
    return this.withRequestLock(async () => {
      if (
        staleSessionId
        && this.session
        && this.session.sessionId !== staleSessionId
      ) {
        return true;
      }
      if (
        !staleSessionId
        && this.session
        && Date.now() - this.session.authenticatedAt < RECENT_LOGIN_GUARD_MS
      ) {
        return true;
      }
      this.invalidateSession();
      return this.login();
    });
  }

  async login(): Promise<boolean> {
    try {
      this.lastLoginError = '';
      const initResp = await fetchCpe(`${this.baseUrl}/`, {
        method: 'GET',
        headers: CPE_INIT_HEADERS,
      });

      const cookies = initResp.headers.get('set-cookie') || '';
      const sessionMatch = cookies.match(/SessionID=([^;]+)/);
      const sessionId = sessionMatch ? sessionMatch[1] : '';

      if (!sessionId) {
        this.lastLoginError = 'CPE 已响应，但未返回 SessionID，请确认设备 Web 管理接口是否兼容。';
        console.error(this.lastLoginError);
        return false;
      }

      const html = await initResp.text();
      const csrfMatches = html.match(/name="csrf_token" content="([^"]+)"/g);
      const csrfTokens = csrfMatches ? csrfMatches.map((m) => {
        const match = m.match(/content="([^"]+)"/);
        return match ? match[1] : '';
      }) : [];

      let token = await this.fetchToken(sessionId, csrfTokens[0] || '');

      const firstNonce = generateHexNonce();
      const challengeXml = buildXmlRequest({
        username: this.username,
        firstnonce: firstNonce,
        mode: 1,
      });

      const challengeResp = await fetchCpe(`${this.baseUrl}/api/user/challenge_login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': `SessionID=${sessionId}`,
          '__RequestVerificationToken': token,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'User-Agent': CPE_USER_AGENT,
          '_ResponseSource': 'Broswer',
        },
        body: challengeXml,
      });

      const challengeText = await challengeResp.text();
      const salt = extractXmlTag(challengeText, 'salt');
      const iterations = parseInt(extractXmlTag(challengeText, 'iterations') || '1000');
      const serverNonce = extractXmlTag(challengeText, 'servernonce');

      if (!salt || !serverNonce) {
        this.lastLoginError = 'CPE 登录质询返回异常，请检查用户名或设备固件接口。';
        console.error(this.lastLoginError, challengeText);
        return false;
      }

      const clientProof = computeClientProof(this.password, salt, iterations, firstNonce, serverNonce);

      token = await this.fetchToken(sessionId, token);

      const authXml = buildXmlRequest({
        clientproof: clientProof,
        finalnonce: serverNonce,
      });

      const authResp = await fetchCpe(`${this.baseUrl}/api/user/authentication_login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': `SessionID=${sessionId}`,
          '__RequestVerificationToken': token,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'User-Agent': CPE_USER_AGENT,
          '_ResponseSource': 'Broswer',
        },
        body: authXml,
      });

      const authText = await authResp.text();
      const rsae = extractXmlTag(authText, 'rsae');
      const rsan = extractXmlTag(authText, 'rsan');

      if (rsae && rsan) {
        const newCookies = authResp.headers.get('set-cookie') || '';
        const newSessionMatch = newCookies.match(/SessionID=([^;]+)/);
        const newSessionId = newSessionMatch ? newSessionMatch[1] : sessionId;

        const now = Date.now();
        this.session = {
          sessionId: newSessionId,
          token,
          rsae,
          rsan,
          authenticatedAt: now,
          lastUsedAt: now,
        };
        this.persistSession(true);
        return true;
      }

      this.lastLoginError = 'CPE 登录认证失败，请检查 CPE 管理密码是否正确。';
      console.error(this.lastLoginError, authText);
      return false;
    } catch (error) {
      this.lastLoginError = this.formatConnectionError(error);
      console.error('CPE login failed:', this.lastLoginError);
      return false;
    }
  }

  async ensureLogin(): Promise<boolean> {
    if (this.isSessionValid()) {
      this.persistSession();
      return true;
    }
    if (!this.loginPromise) {
      this.loginPromise = this.login().finally(() => { this.loginPromise = null; });
    }
    const ok = await this.loginPromise;
    if (!ok) throw new Error(this.lastLoginError || 'CPE 登录失败，请检查设备地址、网络连接和密码。');
    return true;
  }

  getLastLoginError(): string {
    return this.lastLoginError || 'CPE 登录失败，请检查设备地址、网络连接和密码。';
  }

  async refreshToken(): Promise<void> {
    if (!this.session) return;
    const sessionId = this.session.sessionId;
    const requestToken = this.session.token;
    const response = await fetchCpe(`${this.baseUrl}/api/webserver/token`, {
      headers: buildCpeTokenHeaders(sessionId, requestToken),
    });
    const text = await response.text();
    let token = '';
    try {
      token = JSON.parse(text)?.token || '';
    } catch {
      token = extractXmlTag(text, 'token');
    }
    if (token && this.session?.sessionId === sessionId) {
      this.session.token = decodeHtmlEntities(token).substring(32);
      this.persistSession(true);
    }
  }

  rsaEncrypt(value: string): string {
    if (!this.session) throw new Error('CPE session is not available');
    return rsaEncryptValue({ n: this.session.rsan, e: this.session.rsae }, value);
  }

  async postWithSession(
    path: string,
    body: string,
    contentType: string,
  ): Promise<CpePostResult> {
    const session = this.session;
    if (!session) throw new Error('CPE session is not available');
    const response = await fetchCpe(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...buildCpeSessionHeaders(session.sessionId, session.token),
      },
      body,
    });
    return {
      status: response.status,
      text: await response.text(),
      sessionId: session.sessionId,
    };
  }

  async apiGet(path: string, retry = true): Promise<unknown> {
    const result = await this.withRequestLock(async () => {
      if (!this.isSessionValid()) {
        const ok = await this.ensureLogin();
        if (!ok) throw new Error(this.getLastLoginError());
      }
      const session = this.session;
      if (!session) throw new Error('CPE session is not available');
      const resp = await fetchCpe(`${this.baseUrl}${path}`, {
        headers: buildCpeSessionHeaders(session.sessionId, session.token),
      });
      return {
        status: resp.status,
        text: await resp.text(),
        sessionId: session.sessionId,
      };
    });

    if (retry && isCpeAuthenticationFailure(result.status, result.text)) {
      const ok = await this.relogin(result.sessionId);
      if (!ok) throw new Error(this.getLastLoginError());
      return this.apiGet(path, false);
    }

    if (result.status < 200 || result.status >= 300) throw new Error(`API request failed: ${result.status}`);

    this.persistSession();
    try { return JSON.parse(result.text); } catch { return result.text; }
  }

  async apiPost(
    path: string,
    body: string,
    contentType = 'application/json; charset=UTF-8',
    retry = true,
  ): Promise<unknown> {
    const result = await this.withRequestLock(async () => {
      if (!this.isSessionValid()) {
        const ok = await this.ensureLogin();
        if (!ok) throw new Error(this.getLastLoginError());
      }
      return this.postWithSession(path, body, contentType);
    });

    if (retry && isCpeAuthenticationFailure(result.status, result.text)) {
      const ok = await this.relogin(result.sessionId);
      if (!ok) throw new Error(this.getLastLoginError());
      return this.apiPost(path, body, contentType, false);
    }

    if (result.status < 200 || result.status >= 300) throw new Error(`API request failed: ${result.status}`);

    this.persistSession();
    try { return JSON.parse(result.text); } catch { return result.text; }
  }

  private async fetchToken(sessionId: string, currentToken: string): Promise<string> {
    const tokenResp = await fetchCpe(`${this.baseUrl}/api/webserver/token`, {
      method: 'GET',
      headers: buildCpeTokenHeaders(sessionId, currentToken),
    });
    const tokenText = await tokenResp.text();
    let token = currentToken;
    try {
      const tokenData = JSON.parse(tokenText);
      token = tokenData?.token?.substring(32) || token;
    } catch {
      const tokenMatch = tokenText.match(/<token>([^<]+)<\/token>/);
      if (tokenMatch) {
        token = decodeHtmlEntities(tokenMatch[1]).substring(32);
      }
    }
    return token;
  }

  private formatConnectionError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && error.cause != null
      ? String(error.cause)
      : '';
    const detail = `${message} ${cause}`;

    if (detail.includes('UND_ERR_CONNECT_TIMEOUT') || detail.includes('Connect Timeout')) {
      return `无法连接 CPE (${this.baseUrl})：连接超时。请确认设备在线、地址正确，且当前电脑与 CPE 在同一网络。`;
    }
    if (detail.includes('ECONNREFUSED')) {
      return `无法连接 CPE (${this.baseUrl})：设备拒绝连接。请确认 Web 管理端口和协议是否正确。`;
    }
    if (detail.includes('ENOTFOUND') || detail.includes('EAI_AGAIN')) {
      return `无法解析 CPE 地址 (${this.baseUrl})。请检查 CPE 地址配置。`;
    }
    return `CPE 登录失败 (${this.baseUrl})：${message || '未知网络错误'}`;
  }
}
