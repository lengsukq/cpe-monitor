import crypto from 'crypto';
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

const SESSION_TTL = 10 * 60 * 1000; // 10 minutes

export class CpeClient {
  private baseUrl: string;
  private username: string;
  private password: string;
  private session: CpeSession | null = null;

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
        console.error('Failed to get SessionID');
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
        console.error('Failed to parse challenge response:', challengeText);
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

      console.error('Failed to extract RSA parameters:', authText);
      return false;
    } catch (error) {
      console.error('CPE login failed:', error);
      return false;
    }
  }

  async ensureLogin(): Promise<boolean> {
    if (this.isSessionValid()) return true;
    return await this.login();
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

  private async apiGet(path: string): Promise<any> {
    if (!this.isSessionValid()) {
      const ok = await this.login();
      if (!ok) throw new Error('CPE login failed');
    }

    const resp = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Cookie': `SessionID=${this.session!.sessionId}`,
        '__RequestVerificationToken': this.session!.token,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        '_ResponseSource': 'Broswer',
      },
    });

    // If unauthorized, re-login once
    if (resp.status === 401 || resp.status === 403) {
      this.session = null;
      const ok = await this.login();
      if (!ok) throw new Error('CPE re-login failed');

      return this.apiGet(path); // retry
    }

    if (!resp.ok) throw new Error(`API request failed: ${resp.status}`);

    const text = await resp.text();
    try { return JSON.parse(text); } catch { return text; }
  }

  async getDeviceInfo(): Promise<any> { return this.apiGet('/api/system/deviceinfoex'); }
  async getOnlineState(): Promise<any> { return this.apiGet('/api/system/onlinestate?devid=all'); }
  async getTrafficStatistics(): Promise<any> {
    const raw = await this.apiGet('/api/monitoring/traffic-statistics');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }

  async getStartDate(): Promise<any> {
    const raw = await this.apiGet('/api/monitoring/start_date');
    if (typeof raw === 'object') return raw;
    return this.parseXmlResponse(raw);
  }

  private parseXmlResponse(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const matches = xml.matchAll(/<(\w+)>([^<]*)<\/\1>/g);
    for (const m of matches) {
      result[m[1]] = m[2];
    }
    return result;
  }

  async getHostInfo(): Promise<{ devices: CpeDevice[] }> {
    const data = await this.apiGet('/api/system/HostInfo');
    const devices: CpeDevice[] = [];
    if (data && Array.isArray(data)) {
      for (const host of data) {
        devices.push({
          name: host.HostName || 'Unknown',
          ip: host.IPAddress || '',
          mac: host.MACAddress || '',
          uploadBytes: parseInt(host.UploadBytes || '0'),
          downloadBytes: parseInt(host.DownloadBytes || '0'),
          onlineDuration: parseInt(host.OnlineDuration || '0'),
        });
      }
    }
    return { devices };
  }

  async getRawHostInfo(): Promise<any[]> {
    const data = await this.apiGet('/api/system/HostInfo');
    return Array.isArray(data) ? data : [];
  }

  async getTrafficData(): Promise<CpeTrafficData> {
    await this.ensureLogin();
    const [onlineState, hostInfo] = await Promise.all([this.getOnlineState(), this.getHostInfo()]);
    let signalStrength = 0;
    if (onlineState?.CellData) signalStrength = parseInt(onlineState.CellData.SignalStrength || '0');
    let totalUpload = 0, totalDownload = 0;
    for (const d of hostInfo.devices) { totalUpload += d.uploadBytes; totalDownload += d.downloadBytes; }
    return { uploadBytes: totalUpload, downloadBytes: totalDownload, connectedDevices: hostInfo.devices.length, signalStrength, devices: hostInfo.devices };
  }
}

// Singleton manager
let cachedClient: CpeClient | null = null;

export function getCpeClient(): CpeClient | null {
  return cachedClient;
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
  if (!config || !config.cpe_password_encrypted) {
    throw new Error('CPE not configured');
  }

  cachedClient = new CpeClient(
    config.cpe_url || 'http://192.168.31.1',
    config.cpe_username || 'admin',
    config.cpe_password_encrypted
  );
  return cachedClient;
}
