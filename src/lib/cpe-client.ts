import crypto from 'crypto';
import forge from 'node-forge';
import { db, initializeDatabase } from './db';

interface CpeSession {
  sessionId: string;
  token: string;
  rsae: string;
  rsan: string;
  loginTime: number;
}

interface CpeDevice {
  name: string;
  ip: string;
  mac: string;
  online: boolean;
  uploadBytes: number;
  downloadBytes: number;
  onlineDuration: number;
}

interface CpeTrafficData {
  uploadBytes: number;
  downloadBytes: number;
  connectedDevices: number;
  signalStrength: number;
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

const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

export class CpeClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private session: CpeSession | null = null;
  private loginPromise: Promise<boolean> | null = null;
  private requestQueue: Promise<void> = Promise.resolve();
  private lastLoginError = '';

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;
  }

  private isSessionValid(): boolean {
    if (!this.session) return false;
    return Date.now() - this.session.loginTime < SESSION_TTL;
  }

  private generateNonce(): string {
    return crypto.randomBytes(32).toString('hex');
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

  private async relogin(): Promise<boolean> {
    return this.withRequestLock(async () => {
      this.session = null;
      return this.login();
    });
  }

  private decodeHtmlEntities(str: string): string {
    return str
      .replace(/&#x2F;/g, '/')
      .replace(/&#x3D;/g, '=')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  async login(): Promise<boolean> {
    try {
      this.lastLoginError = '';
      const initResp = await fetch(`${this.baseUrl}/`, {
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

      const tokenResp = await fetch(`${this.baseUrl}/api/webserver/token`, {
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
          token = this.decodeHtmlEntities(tokenMatch[1]).substring(32);
        }
      }

      const firstNonce = this.generateNonce();
      const challengeXml = `<?xml version="1.0" encoding="UTF-8"?><request><username>${this.username}</username><firstnonce>${firstNonce}</firstnonce><mode>1</mode></request>`;

      const challengeResp = await fetch(`${this.baseUrl}/api/user/challenge_login`, {
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
      let salt = this.decodeHtmlEntities(this.extractValue(challengeText, 'salt') || '');
      let iterations = parseInt(this.extractValue(challengeText, 'iterations') || '1000');
      let serverNonce = this.decodeHtmlEntities(this.extractValue(challengeText, 'servernonce') || '');

      if (!salt || !serverNonce) {
        this.lastLoginError = 'CPE 登录质询返回异常，请检查用户名或设备固件接口。';
        console.error(this.lastLoginError, challengeText);
        return false;
      }

      const clientProof = this.computeClientProof(this.password, salt, iterations, firstNonce, serverNonce);

      // Refresh token before authentication_login
      const tokenResp2 = await fetch(`${this.baseUrl}/api/webserver/token`, {
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
          token = this.decodeHtmlEntities(tokenMatch2[1]).substring(32);
        }
      }

      const authXml = `<?xml version="1.0" encoding="UTF-8"?><request><clientproof>${clientProof}</clientproof><finalnonce>${serverNonce}</finalnonce></request>`;

      const authResp = await fetch(`${this.baseUrl}/api/user/authentication_login`, {
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
      const rsae = this.extractValue(authText, 'rsae');
      const rsan = this.extractValue(authText, 'rsan');

      if (rsae && rsan) {
        const newCookies = authResp.headers.get('set-cookie') || '';
        const newSessionMatch = newCookies.match(/SessionID=([^;]+)/);
        const newSessionId = newSessionMatch ? newSessionMatch[1] : sessionId;

        this.session = {
          sessionId: newSessionId,
          token,
          rsae,
          rsan,
          loginTime: Date.now(),
        };
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
    if (this.isSessionValid()) return true;
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

  private extractValue(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
    return match ? match[1] : null;
  }

  private extractXmlTag(xml: string, tag: string): string {
    const safeTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = xml.match(new RegExp(`<${safeTag}>([\\s\\S]*?)</${safeTag}>`, 'i'));
    return match ? this.decodeHtmlEntities(match[1]).trim() : '';
  }

  private async refreshTokenUnlocked(): Promise<void> {
    if (!this.session) return;
    const sessionId = this.session.sessionId;
    const requestToken = this.session.token;
    const response = await fetch(`${this.baseUrl}/api/webserver/token`, {
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
      token = this.extractXmlTag(text, 'token');
    }
    if (token && this.session?.sessionId === sessionId) {
      this.session.token = this.decodeHtmlEntities(token).substring(32);
    }
  }

  private rsaEncrypt(value: string): string {
    if (!this.session) throw new Error('CPE session is not available');
    const pem = forge.pki.publicKeyToPem({ n: this.session.rsan, e: this.session.rsae } as any);
    const publicKey = forge.pki.publicKeyFromPem(pem);
    const base64 = forge.util.encode64(forge.util.encodeUtf8(value));
    return forge.util.bytesToHex(publicKey.encrypt(forge.util.encodeUtf8(base64), 'RSA-OAEP'));
  }

  private async postWithSession(path: string, body: string, contentType: string): Promise<{ status: number; text: string }> {
    const session = this.session;
    if (!session) throw new Error('CPE session is not available');
    const response = await fetch(`${this.baseUrl}${path}`, {
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
    return { status: response.status, text: await response.text() };
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
      const requestXml = `<?xml version="1.0" encoding="UTF-8"?><request>${Object.entries(requestData)
        .map(([key, value]) => `<${key}>${String(value)}</${key}>`)
        .join('')}</request>`;
      const result = await this.postWithSession(
        path,
        requestXml,
        encryptPhone ? 'application/x-www-form-urlencoded; charset=UTF-8;enp' : 'application/x-www-form-urlencoded; charset=UTF-8',
      );
      return { result, firstNonce, secondNonce };
    });

    const { result, firstNonce, secondNonce } = encryptedAttempt;
    if (retry && (result.status === 401 || result.status === 403)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.apiPostEncrypted(path, data, encryptPhone, false);
    }
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`API request failed: ${result.status}`);
    }

    const xml = result.text;
    if (retry && /<title>[^<]*(登录|login)/i.test(xml)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.apiPostEncrypted(path, data, encryptPhone, false);
    }
    if (/<error[\s>]/i.test(xml)) return '';

    const encrypted = this.extractXmlTag(xml, 'pwd');
    const hash = this.extractXmlTag(xml, 'hash');
    const iterations = Number(this.extractXmlTag(xml, 'iter'));
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

  private async apiGet(path: string, retry = true): Promise<any> {
    const result = await this.withRequestLock(async () => {
      if (!this.isSessionValid()) {
        const ok = await this.ensureLogin();
        if (!ok) throw new Error(this.getLastLoginError());
      }
      const session = this.session;
      if (!session) throw new Error('CPE session is not available');
      const resp = await fetch(`${this.baseUrl}${path}`, {
        headers: {
          'Cookie': `SessionID=${session.sessionId}`,
          '__RequestVerificationToken': session.token,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          '_ResponseSource': 'Broswer',
        },
      });
      return { status: resp.status, text: await resp.text() };
    });

    // If unauthorized, re-login once
    if (retry && (result.status === 401 || result.status === 403)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());

      return this.apiGet(path, false); // retry once after renewal
    }

    if (result.status < 200 || result.status >= 300) throw new Error(`API request failed: ${result.status}`);

    if (retry && /<title>[^<]*(登录|login)/i.test(result.text)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.apiGet(path, false);
    }
    try { return JSON.parse(result.text); } catch { return result.text; }
  }

  private async apiPost(path: string, body: string, contentType = 'application/json; charset=UTF-8', retry = true): Promise<any> {
    const result = await this.withRequestLock(async () => {
      if (!this.isSessionValid()) {
        const ok = await this.ensureLogin();
        if (!ok) throw new Error(this.getLastLoginError());
      }
      return this.postWithSession(path, body, contentType);
    });

    if (retry && (result.status === 401 || result.status === 403)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());

      return this.apiPost(path, body, contentType, false);
    }

    if (result.status < 200 || result.status >= 300) throw new Error(`API request failed: ${result.status}`);

    try { return JSON.parse(result.text); } catch { return result.text; }
  }

  async getDeviceInfo(retry = true): Promise<any> {
    const data = await this.apiGet('/api/system/deviceinfoex');
    if (retry && (!data || typeof data !== 'object' || Object.keys(data).length === 0)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getDeviceInfo(false);
    }
    return data;
  }
  async getCellInformation(): Promise<any> { return this.getNetworkSnapshot(); }
  async getDeviceInformation(retry = true): Promise<any> {
    const raw = await this.apiGet('/api/device/information');
    const data = typeof raw === 'object' ? raw : this.parseXmlResponse(raw);
    if (retry && (!data || typeof data !== 'object' || !data.DeviceName || !data.Imei || !data.MacAddress1)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getDeviceInformation(false);
    }
    return data;
  }
  async getOnlineState(retry = true): Promise<any> {
    const data = await this.apiGet('/api/system/onlinestate');
    if (retry && (!data || typeof data !== 'object' || !data.DeviceName || !data.CurrentVersion || !data.IpAddress)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getOnlineState(false);
    }
    return data;
  }
  async getTopology(): Promise<any> {
    const raw = await this.apiGet('/api/system/topology');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }
  async getDevCapacity(): Promise<any> {
    const raw = await this.apiGet('/api/system/devcapacity');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }
  async getWlanDbho(): Promise<any> {
    const raw = await this.apiGet('/api/wlan/wlandbho');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }
  async getPortalSettings(): Promise<any> {
    const raw = await this.apiGet('/api/lan/portal-settings');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }
  async getIocDeviceCapacity(): Promise<any> { return this.apiGet('/system/ioc_device_capacity.json'); }
  async getVendorName(language = 'zh_cn'): Promise<any> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><request><language>${language}</language></request>`;
    const raw = await this.apiPost('/api/device/vendorname', xml, 'application/x-www-form-urlencoded; charset=UTF-8');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }
  async checkOnlineUpgrade(): Promise<any> {
    return this.apiPost('/api/system/onlineupg', JSON.stringify({ action: 'check', data: { UpdateAction: 1 } }));
  }
  async getTrafficStatistics(): Promise<any> {
    const raw = await this.apiGet('/api/monitoring/traffic-statistics');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }

  async getMonthStatistics(): Promise<Record<string, string>> {
    const raw = await this.apiGet('/api/monitoring/month_statistics');
    return this.parseXmlResponse(raw);
  }

  async getStartDate(): Promise<any> {
    const raw = await this.apiGet('/api/monitoring/start_date');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }

  async getMonitoringStatus(): Promise<Record<string, string>> {
    return this.parseXmlResponse(await this.apiGet('/api/monitoring/status'));
  }

  async getCurrentPlmn(): Promise<Record<string, string>> {
    return this.parseXmlResponse(await this.apiGet('/api/net/current-plmn'));
  }

  async getCellInfo(): Promise<Record<string, string>> {
    return this.parseXmlResponse(await this.apiGet('/api/net/cell-info'));
  }

  async getSignalInfo(): Promise<Record<string, string>> {
    return this.parseXmlResponse(await this.apiGet('/api/device/signal'));
  }

  private parseSmsMessages(xml: string): CpeSmsMessage[] {
    if (!xml || /<error[\s>]/i.test(xml)) return [];
    const messages: CpeSmsMessage[] = [];
    const blocks = xml.matchAll(/<message>([\s\S]*?)<\/message>/gi);
    for (const block of blocks) {
      const item = block[1];
      const phone = this.extractXmlTag(item, 'phone');
      const content = this.extractXmlTag(item, 'content');
      const date = this.extractXmlTag(item, 'date');
      const status = this.extractXmlTag(item, 'smstat');
      const type = this.extractXmlTag(item, 'smstype');
      const box = this.extractXmlTag(item, 'curbox');
      const index = this.extractXmlTag(item, 'index');
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
    const raw = await this.apiGet('/api/sms/sms-count');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
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

  async getNetworkSnapshot(retry = true): Promise<any> {
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

  private parseXmlResponse(xml: unknown): Record<string, string> {
    const result: Record<string, string> = {};
    if (xml && typeof xml === 'object' && !Array.isArray(xml)) {
      const object = xml as Record<string, unknown>;
      const source = object.response && typeof object.response === 'object'
        ? object.response as Record<string, unknown>
        : object.data && typeof object.data === 'object'
          ? object.data as Record<string, unknown>
          : object;
      for (const [key, value] of Object.entries(source)) {
        if (value !== null && ['string', 'number', 'boolean'].includes(typeof value)) {
          result[key] = this.decodeHtmlEntities(String(value));
        }
      }
      return result;
    }
    if (typeof xml !== 'string' || /<error[\s>]/i.test(xml)) return result;
    const matches = xml.matchAll(/<([\w-]+)>([^<]*)<\/\1>/g);
    for (const m of matches) {
      result[m[1]] = this.decodeHtmlEntities(m[2]);
    }
    return result;
  }

  private parseSignalValue(value: unknown): number {
    const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  private async getHostInfoRaw(retry = true): Promise<any[]> {
    const data = await this.apiGet('/api/system/HostInfo');
    if (retry && (!Array.isArray(data) || data.length === 0)) {
      const ok = await this.relogin();
      if (!ok) throw new Error(this.getLastLoginError());
      return this.getHostInfoRaw(false);
    }
    return Array.isArray(data) ? data : [];
  }

  async getHostInfo(): Promise<{ devices: CpeDevice[] }> {
    const data = await this.getHostInfoRaw();
    const devices: CpeDevice[] = [];
    for (const host of data) {
      const txKBytes = parseInt(host.TxKBytes || '0', 10);
      const rxKBytes = parseInt(host.RxKBytes || '0', 10);
      devices.push({
        name: host.ActualName || host.HostName || 'Unknown',
        ip: host.IPAddress || '',
        mac: host.MACAddress || '',
        online: Boolean(host.Active),
        uploadBytes: (txKBytes || parseInt(host.UploadBytes || '0', 10)) * 1024,
        downloadBytes: (rxKBytes || parseInt(host.DownloadBytes || '0', 10)) * 1024,
        onlineDuration: parseInt(host.AssociatedTime || host.OnlineDuration || '0', 10),
      });
    }
    return { devices };
  }

  async getRawHostInfo(): Promise<any[]> {
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
      uploadBytes: parseInt(trafficStats?.CurrentUpload || String(totalUpload), 10) || 0,
      downloadBytes: parseInt(trafficStats?.CurrentDownload || String(totalDownload), 10) || 0,
      connectedDevices: onlineDevices.length,
      signalStrength,
      devices: onlineDevices,
    };
  }
}

// Singleton manager
let cachedClient: CpeClient | null = null;

export function getCpeClient(): CpeClient | null {
  return cachedClient;
}

export function resetCpeClient() {
  cachedClient = null;
}

export function initCpeClient(url: string, username: string, password: string): CpeClient {
  if (!cachedClient || cachedClient['baseUrl'] !== url || cachedClient['username'] !== username || cachedClient['password'] !== password) {
    cachedClient = new CpeClient(url, username, password);
  }
  return cachedClient;
}

export function getOrCreateCpeClient(): CpeClient {
  if (cachedClient) return cachedClient;

  try {
    initializeDatabase();
  } catch {}

  const config = db.prepare('SELECT * FROM cpe_config LIMIT 1').get() as any;
  const password = process.env.CPE_PASSWORD || config?.cpe_password_encrypted;
  if (!password) {
    throw new Error('CPE not configured');
  }

  cachedClient = new CpeClient(
    config?.cpe_url || process.env.CPE_DEFAULT_URL || 'http://192.168.31.1',
    config?.cpe_username || process.env.CPE_USERNAME || 'admin',
    password || ''
  );
  return cachedClient;
}
