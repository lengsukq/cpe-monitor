/**
 * CpeNetworkReader — handles network status, signal, and traffic data retrieval.
 *
 * Extracted from CpeClient to enforce Single Responsibility Principle.
 */
import { parseCpeRecord } from './cpe-protocol';
import type { CpeAuthenticator } from './cpe-authenticator';
import type { CpeNetworkSnapshot } from '@/types/cpe';

export class CpeNetworkReader {
  private auth: CpeAuthenticator;

  constructor(auth: CpeAuthenticator) {
    this.auth = auth;
  }

  async getMonitoringStatus(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.auth.apiGet('/api/monitoring/status'));
  }

  async getCurrentPlmn(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.auth.apiGet('/api/net/current-plmn'));
  }

  async getCellInfo(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.auth.apiGet('/api/net/cell-info'));
  }

  async getSignalInfo(): Promise<Record<string, string>> {
    return parseCpeRecord(await this.auth.apiGet('/api/device/signal'));
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

    const snapshot: CpeNetworkSnapshot = {
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
      const ok = await this.auth.relogin();
      if (!ok) throw new Error(this.auth.getLastLoginError());
      return this.getNetworkSnapshot(false);
    }
    return snapshot;
  }

  parseSignalValue(value: unknown): number {
    const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  parseOptionalSignalValue(value: unknown): number | null {
    const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }
}
