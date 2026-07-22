import crypto from 'crypto';
import forge from 'node-forge';
import { initializeDatabase } from './db';
import { getCpeCredentials } from './settings-store';
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
  parseCpeRecord,
} from './cpe-protocol';
import type {
  CpeDeviceInformation,
  CpeDeviceState,
  CpeHostRaw,
  CpeNetworkSnapshot,
  CpeOnlineState,
  CpeRecord,
  CpeTrafficStatistics,
} from '@/types/cpe';

type CpeSession = PersistedCpeSession;

export interface CpeDevice {
  name: string;
  ip: string;
  mac: string;
  online: boolean;
  uploadBytes: number;
  downloadBytes: number;
  onlineDuration: number;
  interfaceType: string;
  frequency: string;
  rssi: number | null;
  raw: Record<string, unknown>;
}

export interface CpeTrafficData {
  uploadBytes: number;
  downloadBytes: number;
  connectedDevices: number;
  signalStrength: number;
  networkType: string;
  band: string;
  cellId: string;
  pci: string;
  rsrp: number | null;
  rsrq: number | null;
  sinr: number | null;
  rssi: number | null;
  devices: CpeDevice[];
}

export interface CpeSmsMessage {
  id: string;
  phone: string;
  content: string;
  date: string;
  status: string;
  type: string;
  box: string;
  unread: boolean;
  direction: 'inbound' | 'outbound';
}

const SESSION_PERSIST_INTERVAL = 5 * 60 * 1000;
const RECENT_LOGIN_GUARD_MS = 5 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

function getRequestTimeoutMs(): number {
  const configured = Number(process.env.CPE_REQUEST_TIMEOUT_MS || DEFAULT_REQUEST_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 1_000
    ? Math.floor(configured)
    : DEFAULT_REQUEST_TIMEOUT_MS;
}

function isRecord(value: unknown): value is CpeRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toText(value: unknown, fallback = ''): string {
  return value === null || value === undefined ? fallback : String(value);
}

function isActiveFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export class CpeClient {
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

  private isSessionValid(): boolean {
    return Boolean(this.session);
  }

  private persistSession(force = false) {
    if (!this.session) return;
    const now = Date.now();
    this.session.lastUsedAt = now;
    if (!force && now - this.lastSessionPersistAt < SESSION_PERSIST_INTERVAL) return;
    saveCpeSession(this.baseUrl, this.username, this.session);
    this.lastSessionPersistAt = now;
  }

  private invalidateSession() {
    this.session = null;
    this.lastSessionPersistAt = 0;
    clearCpeSession();
  }

  private generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutMs = getRequestTimeoutMs();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`CPE 请求超时（${Math.ceil(timeoutMs / 1000)} 秒）：${url}`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async withRequestLock<T>(task: () => Promise<T>): Promise<T> {
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

  private async relogin(staleSessionId?: string): Promise<boolean> {
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
      const initResp = await this.fetchWithTimeout(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
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
      const csrfTokens = csrfMatches ? csrfMatches.map(m => {
        const match = m.match(/content="([^"]+)"/);
        return match ? match[1] : '';
      }) : [];

      const tokenResp = await this.fetchWithTimeout(`${this.baseUrl}/api/webserver/token`, {
        method: 'GET',
        headers: {
          'Cookie': `SessionID=${sessionId}`,
          '__RequestVerificationToken': csrfTokens[0] || '',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const tokenText = await tokenResp.text();
      let token = csrfTokens[0] || '';
      try {
        const tokenData = JSON.parse(tokenText);
        token = tokenData?.token?.substring(32) || token;
      } catch {
        const tokenMatch = tokenText.match(/<token>([^<]+)<\/token>/);
        if (tokenMatch) {
          token = decodeHtmlEntities(tokenMatch[1]).substring(32);
        }
      }

      const firstNonce = this.generateNonce();
      const challengeXml = buildXmlRequest({
        username: this.username,
        firstnonce: firstNonce,
        mode: 1,
      });

      const challengeResp = await this.fetchWithTimeout(`${this.baseUrl}/api/user/challenge_login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': `SessionID=${sessionId}`,
          '__RequestVerificationToken': token,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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

      const clientProof = this.computeClientProof(this.password, salt, iterations, firstNonce, serverNonce);

      // Refresh token before authentication_login
      const tokenResp2 = await this.fetchWithTimeout(`${this.baseUrl}/api/webserver/token`, {
        method: 'GET',
        headers: {
          'Cookie': `SessionID=${sessionId}`,
          '__RequestVerificationToken': token,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      const tokenText2 = await tokenResp2.text();
      try {
        const tokenData2 = JSON.parse(tokenText2);
        token = tokenData2?.token?.substring(32) || token;
      } catch {
        const tokenMatch2 = tokenText2.match(/<token>([^<]+)<\/token>/);
        if (tokenMatch2) {
          token = decodeHtmlEntities(tokenMatch2[1]).substring(32);
        }
      }

      const authXml = buildXmlRequest({
        clientproof: clientProof,
        finalnonce: serverNonce,
      });

      const authResp = await this.fetchWithTimeout(`${this.baseUrl}/api/user/authentication_login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': `SessionID=${sessionId}`,
          '__RequestVerificationToken': token,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
    // Several dashboard requests can arrive at the same time. Reuse one
    // in-flight login so we do not invalidate competing sessions.
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

  private formatConnectionError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && 'cause' in error ? String((error as Error & { cause?: unknown }).cause) : '';
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

  private computeClientProof(password: string, saltHex: string, iterations: number, clientNonce: string, serverNonce: string): string {
    const saltBytes = Buffer.from(saltHex, 'hex');
    const saltedPassword = crypto.pbkdf2Sync(Buffer.from(password, 'utf-8'), saltBytes, iterations, 32, 'sha256');
    const clientKey = crypto.createHmac('sha256', 'Client Key').update(saltedPassword).digest();
    const storedKey = crypto.createHash('sha256').update(clientKey).digest();
    const authMessage = clientNonce + ',' + serverNonce + ',' + serverNonce;
    const clientSignature = crypto.createHmac('sha256', authMessage).update(storedKey).digest();
    const clientProof = Buffer.alloc(clientKey.length);
    for (let i = 0; i < clientKey.length; i++) clientProof[i] = clientKey[i] ^ clientSignature[i];
    return clientProof.toString('hex');
  }

  private async refreshTokenUnlocked(): Promise<void> {
    if (!this.session) return;
    const sessionId = this.session.sessionId;
    const requestToken = this.session.token;
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/webserver/token`, {
      headers: {
        Cookie: `SessionID=${sessionId}`,
        '__RequestVerificationToken': requestToken,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        _ResponseSource: 'Broswer',
      },
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

  private rsaEncrypt(value: string): string {
    if (!this.session) throw new Error('CPE session is not available');
    const pem = forge.pki.publicKeyToPem({ n: this.session.rsan, e: this.session.rsae });
    const publicKey = forge.pki.publicKeyFromPem(pem);
    const base64 = forge.util.encode64(forge.util.encodeUtf8(value));
    return forge.util.bytesToHex(publicKey.encrypt(forge.util.encodeUtf8(base64), 'RSA-OAEP'));
  }

  private async postWithSession(
    path: string,
    body: string,
    contentType: string,
  ): Promise<{ status: number; text: string; sessionId: string }> {
    const session = this.session;
    if (!session) throw new Error('CPE session is not available');
    const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Cookie': `SessionID=${session.sessionId}`,
        '__RequestVerificationToken': session.token,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        '_ResponseSource': 'Broswer',
      },
      body,
    });
    return {
      status: response.status,
      text: await response.text(),
      sessionId: session.sessionId,
    };
  }

  private async apiPostEncrypted(
    path: string,
    data: Record<string, string | number>,
    encryptPhone = false,
    retry = true,
  ): Promise<string> {
    const encryptedAttempt = await this.withRequestLock(async () => {
      await this.ensureLogin();
      await this.refreshTokenUnlocked();

      const firstNonce = forge.util.bytesToHex(forge.random.getBytesSync(32));
      const secondNonce = forge.util.bytesToHex(forge.random.getBytesSync(32));
      const requestData: Record<string, string | number> = {
        ...data,
        nonce: this.rsaEncrypt(firstNonce + secondNonce),
        hmac_len: 32,
      };
      if (encryptPhone && typeof requestData.phone === 'string') {
        requestData.phone = this.rsaEncrypt(requestData.phone);
      }
      const requestXml = buildXmlRequest(requestData);
      const result = await this.postWithSession(
        path,
        requestXml,
        encryptPhone ? 'application/x-www-form-urlencoded; charset=UTF-8;enp' : 'application/x-www-form-urlencoded; charset=UTF-8',
      );
      return { result, firstNonce, secondNonce };
    });

    const { result, firstNonce, secondNonce } = encryptedAttempt;
    if (retry && isCpeAuthenticationFailure(result.status, result.text)) {
      const ok = await this.relogin(result.sessionId);
      if (!ok) throw new Error(this.getLastLoginError());
      return this.apiPostEncrypted(path, data, encryptPhone, false);
    }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`API request failed: ${result.status}`);
    }

    const xml = result.text;
    if (/<error[\s>]/i.test(xml)) return '';
    this.persistSession();

    const encrypted = extractXmlTag(xml, 'pwd');
    const hash = extractXmlTag(xml, 'hash');
    const iterations = Number(extractXmlTag(xml, 'iter'));
    if (!encrypted || !hash || !iterations) return xml;

    const firstKey = crypto.pbkdf2Sync(
      Buffer.from(firstNonce.slice(0, 32), 'utf8'),
      Buffer.from(firstNonce.slice(32, 64), 'hex'),
      iterations,
      32,
      'sha256'
    );
    const secondKey = crypto.pbkdf2Sync(
      Buffer.from(secondNonce.slice(0, 32), 'utf8'),
      Buffer.from(secondNonce.slice(32, 64), 'hex'),
      iterations,
      32,
      'sha256'
    );
    const actualHash = crypto.createHmac('sha256', secondKey).update(Buffer.from(encrypted, 'hex')).digest('hex');
    if (actualHash !== hash) throw new Error('CPE SMS response integrity check failed');

    const decipher = crypto.createDecipheriv('aes-128-cbc', firstKey.subarray(0, 16), firstKey.subarray(16, 32));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]).toString('utf8');
  }

  private async apiGet(path: string, retry = true): Promise<unknown> {
    const result = await this.withRequestLock(async () => {
      if (!this.isSessionValid()) {
        const ok = await this.ensureLogin();
        if (!ok) throw new Error(this.getLastLoginError());
      }
      const session = this.session;
      if (!session) throw new Error('CPE session is not available');
      const resp = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
        headers: {
          'Cookie': `SessionID=${session.sessionId}`,
          '__RequestVerificationToken': session.token,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          '_ResponseSource': 'Broswer',
        },
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

      return this.apiGet(path, false); // retry once after renewal
    }

    if (result.status < 200 || result.status >= 300) throw new Error(`API request failed: ${result.status}`);

    this.persistSession();
    try { return JSON.parse(result.text); } catch { return result.text; }
  }

  private async apiPost(path: string, body: string, contentType = 'application/json; charset=UTF-8', retry = true): Promise<unknown> {
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

  private normalizeRecord(raw: unknown): CpeRecord {
    return isRecord(raw) ? raw : parseCpeRecord(raw);
  }

  async getDeviceInfo(retry = true): Promise<CpeDeviceState> {
    const data = this.normalizeRecord(await this.apiGet('/api/system/deviceinfoex')) as CpeDeviceState;
    if (retry && Object.keys(data).length === 0) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getDeviceInfo(false);
    }
    return data;
  }

  async getCellInformation(): Promise<CpeNetworkSnapshot> {
    return this.getNetworkSnapshot();
  }

  async getDeviceInformation(retry = true): Promise<CpeDeviceInformation> {
    const data = this.normalizeRecord(
      await this.apiGet('/api/device/information'),
    ) as CpeDeviceInformation;
    if (retry && (!data.DeviceName || !data.Imei || !data.MacAddress1)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getDeviceInformation(false);
    }
    return data;
  }

  async getOnlineState(retry = true): Promise<CpeOnlineState> {
    const data = this.normalizeRecord(
      await this.apiGet('/api/system/onlinestate'),
    ) as CpeOnlineState;
    if (retry && (!data.DeviceName || !data.CurrentVersion || !data.IpAddress)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getOnlineState(false);
    }
    return data;
  }

  async getTopology(): Promise<unknown> {
    const raw = await this.apiGet('/api/system/topology');
    return isRecord(raw) || Array.isArray(raw) ? raw : parseCpeRecord(raw);
  }

  async getDevCapacity(): Promise<CpeRecord> {
    return this.normalizeRecord(await this.apiGet('/api/system/devcapacity'));
  }

  async getWlanDbho(): Promise<CpeRecord> {
    return this.normalizeRecord(await this.apiGet('/api/wlan/wlandbho'));
  }

  async getPortalSettings(): Promise<CpeRecord> {
    return this.normalizeRecord(await this.apiGet('/api/lan/portal-settings'));
  }

  async getIocDeviceCapacity(): Promise<unknown> {
    return this.apiGet('/system/ioc_device_capacity.json');
  }

  async getVendorName(language = 'zh_cn'): Promise<CpeRecord> {
    const xml = buildXmlRequest({ language });
    return this.normalizeRecord(
      await this.apiPost(
        '/api/device/vendorname',
        xml,
        'application/x-www-form-urlencoded; charset=UTF-8',
      ),
    );
  }

  async checkOnlineUpgrade(): Promise<unknown> {
    return this.apiPost(
      '/api/system/onlineupg',
      JSON.stringify({ action: 'check', data: { UpdateAction: 1 } }),
    );
  }

  async getTrafficStatistics(): Promise<CpeTrafficStatistics> {
    return this.normalizeRecord(
      await this.apiGet('/api/monitoring/traffic-statistics'),
    ) as CpeTrafficStatistics;
  }

  async getMonthStatistics(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.apiGet('/api/monitoring/month_statistics'));
  }

  async getStartDate(): Promise<CpeRecord> {
    return this.normalizeRecord(await this.apiGet('/api/monitoring/start_date'));
  }

  async getMonitoringStatus(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.apiGet('/api/monitoring/status'));
  }

  async getCurrentPlmn(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.apiGet('/api/net/current-plmn'));
  }

  async getCellInfo(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.apiGet('/api/net/cell-info'));
  }

  async getSignalInfo(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.apiGet('/api/device/signal'));
  }

  private parseSmsMessages(xml: string): CpeSmsMessage[] {
    if (!xml || /<error[\s>]/i.test(xml)) return [];
    const messages: CpeSmsMessage[] = [];
    const blocks = xml.matchAll(/<message>([\s\S]*?)<\/message>/gi);
    for (const block of blocks) {
      const item = block[1];
      const phone = extractXmlTag(item, 'phone');
      const content = extractXmlTag(item, 'content');
      const date = extractXmlTag(item, 'date');
      const status = extractXmlTag(item, 'smstat');
      const type = extractXmlTag(item, 'smstype');
      const box = extractXmlTag(item, 'curbox');
      const index = extractXmlTag(item, 'index');
      if (!phone && !content && !date) continue;
      messages.push({
        id: index || `${phone}|${date}|${content}`,
        phone: phone || '-',
        content,
        date,
        status,
        type,
        box,
        unread: status === '0',
        direction: box === '0' ? 'inbound' : 'outbound',
      });
    }
    return messages;
  }

  async getSmsCount(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.apiGet('/api/sms/sms-count'));
  }

  async getSmsMessages(): Promise<{ messages: CpeSmsMessage[]; count: Record<string, string> }> {
    const readSnapshot = async () => {
      const count = await this.getSmsCount();
      const contacts: CpeSmsMessage[] = [];
      const pageSize = 50;

      for (let page = 1; page <= 20; page += 1) {
        const xml = await this.apiPostEncrypted('/api/sms/sms-list-contact', { pageindex: page, readcount: pageSize });
        const pageMessages = this.parseSmsMessages(xml);
        if (pageMessages.length === 0) break;
        contacts.push(...pageMessages);
        if (pageMessages.length < pageSize) break;
      }

      const phoneNumbers = [...new Set(contacts.map((message) => message.phone).filter(Boolean))];
      const messages: CpeSmsMessage[] = [];
      for (const phone of phoneNumbers) {
        for (let page = 1; page <= 20; page += 1) {
          const xml = await this.apiPostEncrypted('/api/sms/sms-list-phone', {
            phone,
            pageindex: page,
            readcount: pageSize,
          }, true);
          const pageMessages = this.parseSmsMessages(xml);
          if (pageMessages.length === 0) break;
          messages.push(...pageMessages);
          if (pageMessages.length < pageSize) break;
        }
      }

      const source = messages.length > 0 ? messages : contacts;
      const unique = new Map<string, CpeSmsMessage>();
      for (const message of source) unique.set(message.id, message);
      return {
        messages: [...unique.values()].sort((a, b) => b.date.localeCompare(a.date)),
        count,
      };
    };

    let result = await readSnapshot();
    const expectedMessages = Number(result.count.LocalInbox || 0);
    if (expectedMessages > 0 && result.messages.length === 0) {
      // A CPE can return a valid count while its encrypted list request is
      // tied to a session that was invalidated by another dashboard request.
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      result = await readSnapshot();
    }
    return result;
  }

  async getNetworkSnapshot(retry = true): Promise<CpeNetworkSnapshot> {
    const [status, plmn, cellInfo, signal] = await Promise.all([
      this.getMonitoringStatus(),
      this.getCurrentPlmn(),
      this.getCellInfo(),
      this.getSignalInfo(),
    ]);

    const signalStrength = this.parseSignalValue(signal.nrrsrp || signal.rsrp || status.SignalStrength);
    const mode = signal.mode || status.CurrentNetworkTypeEx || status.CurrentNetworkType || '';

    const snapshot = {
      status,
      plmn,
      cellInfo,
      signal,
      connectionStatus: status.ConnectionStatus || 'unknown',
      carrier: plmn.FullName || plmn.ShortName || plmn.Numeric || '-',
      plmnCode: plmn.Numeric || signal.plmn || '-',
      networkType: mode === '12' || signal.bandInfo?.startsWith('N') ? '5G NR' : mode,
      cellId: signal.cell_id || cellInfo.cellinfo || '-',
      pci: signal.pci || '-',
      band: signal.band || signal.bandInfo || '-',
      nrarfcn: signal.nrearfcn || '-',
      rsrp: signal.nrrsrp || signal.rsrp || '-',
      rsrq: signal.nrrsrq || signal.rsrq || '-',
      rssi: signal.nrrssi || signal.rssi || '-',
      sinr: signal.nrsinr || signal.sinr || '-',
      signalStrength,
    };

    if (retry && (!plmn.FullName || !signal.mode || !signal.nrrsrp)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getNetworkSnapshot(false);
    }
    return snapshot;
  }

  private parseSignalValue(value: unknown): number {
    const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  private parseOptionalSignalValue(value: unknown): number | null {
    const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  private async getHostInfoRaw(retry = true): Promise<CpeHostRaw[]> {
    const data = await this.apiGet('/api/system/HostInfo');
    const hosts = Array.isArray(data)
      ? data.filter(isRecord) as CpeHostRaw[]
      : [];
    if (retry && hosts.length === 0) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getHostInfoRaw(false);
    }
    return hosts;
  }

  async getHostInfo(): Promise<{ devices: CpeDevice[] }> {
    const data = await this.getHostInfoRaw();
    const devices: CpeDevice[] = [];
    for (const host of data) {
      const txKBytes = parseInt(toText(host.TxKBytes, '0'), 10);
      const rxKBytes = parseInt(toText(host.RxKBytes, '0'), 10);
      devices.push({
        name: toText(host.ActualName || host.HostName, 'Unknown'),
        ip: toText(host.IPAddress),
        mac: toText(host.MACAddress),
        online: isActiveFlag(host.Active),
        uploadBytes: (
          txKBytes || parseInt(toText(host.UploadBytes, '0'), 10)
        ) * 1024,
        downloadBytes: (
          rxKBytes || parseInt(toText(host.DownloadBytes, '0'), 10)
        ) * 1024,
        onlineDuration: parseInt(
          toText(host.AssociatedTime || host.OnlineDuration, '0'),
          10,
        ),
        interfaceType: toText(host.InterfaceType),
        frequency: toText(host.Frequency),
        rssi: this.parseOptionalSignalValue(host.rssi || host.SignalStrength),
        raw: host,
      });
    }
    return { devices };
  }

  async getRawHostInfo(): Promise<CpeHostRaw[]> {
    return this.getHostInfoRaw();
  }

  async getTrafficData(): Promise<CpeTrafficData> {
    await this.ensureLogin();
    const [networkSnapshot, hostInfo, trafficStats] = await Promise.all([
      this.getNetworkSnapshot(),
      this.getHostInfo(),
      this.getTrafficStatistics(),
    ]);
    const signalStrength = networkSnapshot.signalStrength || 0;
    const onlineDevices = hostInfo.devices.filter((device) => device.online);
    let totalUpload = 0, totalDownload = 0;
    for (const d of onlineDevices) { totalUpload += d.uploadBytes; totalDownload += d.downloadBytes; }
    // Keep the history/alert counters aligned with the router's own traffic
    // statistics. Per-device counters remain available for report rankings.
    return {
      uploadBytes: parseInt(toText(trafficStats.CurrentUpload, String(totalUpload)), 10) || 0,
      downloadBytes: parseInt(toText(trafficStats.CurrentDownload, String(totalDownload)), 10) || 0,
      connectedDevices: onlineDevices.length,
      signalStrength,
      networkType: String(networkSnapshot.networkType || ''),
      band: String(networkSnapshot.band || ''),
      cellId: String(networkSnapshot.cellId || ''),
      pci: String(networkSnapshot.pci || ''),
      rsrp: this.parseOptionalSignalValue(networkSnapshot.rsrp),
      rsrq: this.parseOptionalSignalValue(networkSnapshot.rsrq),
      sinr: this.parseOptionalSignalValue(networkSnapshot.sinr),
      rssi: this.parseOptionalSignalValue(networkSnapshot.rssi),
      devices: onlineDevices,
    };
  }
}

// Singleton manager
let cachedClient: CpeClient | null = null;

export function getCpeClient(): CpeClient | null {
  return cachedClient;
}

export function resetCpeClient(): void {
  cachedClient = null;
  clearCpeSession();
}

export function initCpeClient(url: string, username: string, password: string): CpeClient {
  if (!cachedClient || !cachedClient.matchesCredentials(url, username, password)) {
    if (cachedClient) clearCpeSession();
    cachedClient = new CpeClient(url, username, password);
  }
  return cachedClient;
}

export function getOrCreateCpeClient(): CpeClient {
  if (cachedClient) return cachedClient;

  try {
    initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database before CPE client create', error);
  }

  const credentials = getCpeCredentials();
  cachedClient = new CpeClient(credentials.url, credentials.username, credentials.password);
  return cachedClient;
}
