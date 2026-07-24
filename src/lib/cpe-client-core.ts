/**
 * CpeClient — Facade that composes CpeAuthenticator, CpeNetworkReader, and CpeSmsReader.
 *
 * Provides a unified API surface for CPE device interaction while each
 * sub-module handles a single responsibility.
 */
import { CpeAuthenticator } from './cpe-authenticator';
import { CpeNetworkReader } from './cpe-network-reader';
import { CpeSmsReader } from './cpe-sms-reader';
import { buildXmlRequest, parseCpeRecord } from './cpe-protocol';
import type {
  CpeDevice,
  CpeDeviceInformation,
  CpeDeviceState,
  CpeHostRaw,
  CpeNetworkSnapshot,
  CpeOnlineState,
  CpeRecord,
  CpeSmsMessage,
  CpeTrafficData,
  CpeTrafficStatistics,
} from '@/types/cpe';

function isRecord(value: unknown): value is CpeRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toText(value: unknown, fallback = ''): string {
  return value === null || value === undefined ? fallback : String(value);
}

function isActiveFlag(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export type CpeConnectionState = 'online' | 'reconnecting' | 'offline';

const MAX_CONSECUTIVE_FAILURES = 5;

export class CpeClient {
  private auth: CpeAuthenticator;
  private network: CpeNetworkReader;
  private sms: CpeSmsReader;
  private consecutiveFailures = 0;
  private _connectionState: CpeConnectionState = 'online';

  constructor(baseUrl: string, username: string, password: string) {
    this.auth = new CpeAuthenticator(baseUrl, username, password);
    this.network = new CpeNetworkReader(this.auth);
    this.sms = new CpeSmsReader(this.auth);
  }

  get connectionState(): CpeConnectionState {
    return this._connectionState;
  }

  get isDegraded(): boolean {
    return this._connectionState === 'offline';
  }

  private trackSuccess(): void {
    if (this.consecutiveFailures > 0 || this._connectionState !== 'online') {
      this.consecutiveFailures = 0;
      this._connectionState = 'online';
    }
  }

  private trackFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      this._connectionState = 'offline';
    } else if (this.consecutiveFailures >= 2) {
      this._connectionState = 'reconnecting';
    }
  }

  matchesCredentials(baseUrl: string, username: string, password: string): boolean {
    return this.auth.matchesCredentials(baseUrl, username, password);
  }

  async login(): Promise<boolean> {
    return this.auth.login();
  }

  async ensureLogin(): Promise<boolean> {
    try {
      const result = await this.auth.ensureLogin();
      if (result) this.trackSuccess();
      else this.trackFailure();
      return result;
    } catch {
      this.trackFailure();
      return false;
    }
  }

  getLastLoginError(): string {
    return this.auth.getLastLoginError();
  }

  // ─── Device Information ───────────────────────────────────────────────

  async getDeviceInfo(retry = true): Promise<CpeDeviceState> {
    const data = this.normalizeRecord(await this.auth.apiGet('/api/system/deviceinfoex')) as CpeDeviceState;
    if (retry && Object.keys(data).length === 0) {
      const ok = await this.auth.relogin();
      if (!ok) throw new Error(this.auth.getLastLoginError());
      return this.getDeviceInfo(false);
    }
    return data;
  }

  async getDeviceInformation(retry = true): Promise<CpeDeviceInformation> {
    const data = this.normalizeRecord(
      await this.auth.apiGet('/api/device/information'),
    ) as CpeDeviceInformation;
    if (retry && (!data.DeviceName || !data.Imei || !data.MacAddress1)) {
      const ok = await this.auth.relogin();
      if (!ok) throw new Error(this.auth.getLastLoginError());
      return this.getDeviceInformation(false);
    }
    return data;
  }

  async getOnlineState(retry = true): Promise<CpeOnlineState> {
    const data = this.normalizeRecord(
      await this.auth.apiGet('/api/system/onlinestate'),
    ) as CpeOnlineState;
    if (retry && (!data.DeviceName || !data.CurrentVersion || !data.IpAddress)) {
      const ok = await this.auth.relogin();
      if (!ok) throw new Error(this.auth.getLastLoginError());
      return this.getOnlineState(false);
    }
    return data;
  }

  async getTopology(): Promise<unknown> {
    const raw = await this.auth.apiGet('/api/system/topology');
    return isRecord(raw) || Array.isArray(raw) ? raw : parseCpeRecord(raw);
  }

  async getDevCapacity(): Promise<CpeRecord> {
    return this.normalizeRecord(await this.auth.apiGet('/api/system/devcapacity'));
  }

  async getWlanDbho(): Promise<CpeRecord> {
    return this.normalizeRecord(await this.auth.apiGet('/api/wlan/wlandbho'));
  }

  async getPortalSettings(): Promise<CpeRecord> {
    return this.normalizeRecord(await this.auth.apiGet('/api/lan/portal-settings'));
  }

  async getIocDeviceCapacity(): Promise<unknown> {
    return this.auth.apiGet('/system/ioc_device_capacity.json');
  }

  async getVendorName(language = 'zh_cn'): Promise<CpeRecord> {
    const xml = buildXmlRequest({ language });
    return this.normalizeRecord(
      await this.auth.apiPost(
        '/api/device/vendorname',
        xml,
        'application/x-www-form-urlencoded; charset=UTF-8',
      ),
    );
  }

  async checkOnlineUpgrade(): Promise<unknown> {
    return this.auth.apiPost(
      '/api/system/onlineupg',
      JSON.stringify({ action: 'check', data: { UpdateAction: 1 } }),
    );
  }

  // ─── Network & Signal (delegated to CpeNetworkReader) ─────────────────

  async getCellInformation(): Promise<CpeNetworkSnapshot> {
    return this.network.getNetworkSnapshot();
  }

  async getNetworkSnapshot(retry = true): Promise<CpeNetworkSnapshot> {
    return this.network.getNetworkSnapshot(retry);
  }

  async getMonitoringStatus(): Promise<Record<string, string>> {
    return this.network.getMonitoringStatus();
  }

  async getCurrentPlmn(): Promise<Record<string, string>> {
    return this.network.getCurrentPlmn();
  }

  async getCellInfo(): Promise<Record<string, string>> {
    return this.network.getCellInfo();
  }

  async getSignalInfo(): Promise<Record<string, string>> {
    return this.network.getSignalInfo();
  }

  // ─── Traffic Statistics ───────────────────────────────────────────────

  async getTrafficStatistics(): Promise<CpeTrafficStatistics> {
    return this.normalizeRecord(
      await this.auth.apiGet('/api/monitoring/traffic-statistics'),
    ) as CpeTrafficStatistics;
  }

  async getMonthStatistics(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.auth.apiGet('/api/monitoring/month_statistics'));
  }

  async getStartDate(): Promise<CpeRecord> {
    return this.normalizeRecord(await this.auth.apiGet('/api/monitoring/start_date'));
  }

  // ─── SMS (delegated to CpeSmsReader) ──────────────────────────────────

  async getSmsCount(): Promise<Record<string, string>> {
    return this.sms.getSmsCount();
  }

  async getSmsMessages(): Promise<{ messages: CpeSmsMessage[]; count: Record<string, string> }> {
    return this.sms.getSmsMessages();
  }

  // ─── Host / Device List ───────────────────────────────────────────────

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
        uploadBytes: (txKBytes || parseInt(toText(host.UploadBytes, '0'), 10)) * 1024,
        downloadBytes: (rxKBytes || parseInt(toText(host.DownloadBytes, '0'), 10)) * 1024,
        onlineDuration: parseInt(toText(host.AssociatedTime || host.OnlineDuration, '0'), 10),
        interfaceType: toText(host.InterfaceType),
        frequency: toText(host.Frequency),
        rssi: this.network.parseOptionalSignalValue(host.rssi || host.SignalStrength),
        raw: host,
      });
    }
    return { devices };
  }

  async getRawHostInfo(): Promise<CpeHostRaw[]> {
    return this.getHostInfoRaw();
  }

  // ─── Composite Data ───────────────────────────────────────────────────

  async getTrafficData(): Promise<CpeTrafficData> {
    await this.auth.ensureLogin();
    const [networkSnapshot, hostInfo, trafficStats] = await Promise.all([
      this.network.getNetworkSnapshot(),
      this.getHostInfo(),
      this.getTrafficStatistics(),
    ]);
    const signalStrength = networkSnapshot.signalStrength || 0;
    const onlineDevices = hostInfo.devices.filter((device) => device.online);
    let totalUpload = 0;
    let totalDownload = 0;
    for (const d of onlineDevices) {
      totalUpload += d.uploadBytes;
      totalDownload += d.downloadBytes;
    }
    return {
      uploadBytes: parseInt(toText(trafficStats.CurrentUpload, String(totalUpload)), 10) || 0,
      downloadBytes: parseInt(toText(trafficStats.CurrentDownload, String(totalDownload)), 10) || 0,
      connectedDevices: onlineDevices.length,
      signalStrength,
      networkType: String(networkSnapshot.networkType || ''),
      band: String(networkSnapshot.band || ''),
      cellId: String(networkSnapshot.cellId || ''),
      pci: String(networkSnapshot.pci || ''),
      rsrp: this.network.parseOptionalSignalValue(networkSnapshot.rsrp),
      rsrq: this.network.parseOptionalSignalValue(networkSnapshot.rsrq),
      sinr: this.network.parseOptionalSignalValue(networkSnapshot.sinr),
      rssi: this.network.parseOptionalSignalValue(networkSnapshot.rssi),
      devices: onlineDevices,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private normalizeRecord(raw: unknown): CpeRecord {
    return isRecord(raw) ? raw : parseCpeRecord(raw);
  }

  private async getHostInfoRaw(retry = true): Promise<CpeHostRaw[]> {
    const data = await this.auth.apiGet('/api/system/HostInfo');
    const hosts = Array.isArray(data)
      ? data.filter(isRecord) as CpeHostRaw[]
      : [];
    if (retry && hosts.length === 0) {
      const ok = await this.auth.relogin();
      if (!ok) throw new Error(this.auth.getLastLoginError());
      return this.getHostInfoRaw(false);
    }
    return hosts;
  }
}
