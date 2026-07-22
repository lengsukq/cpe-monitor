import { db, ensureDatabaseReady } from '@/lib/db';

export interface TrafficHistoryRow {
  timestamp: string;
  upload_bytes: number | null;
  download_bytes: number | null;
  delta_upload_bytes: number | null;
  delta_download_bytes: number | null;
  upload_bps: number | null;
  download_bps: number | null;
  connected_devices: number | null;
  signal_strength: number | null;
  network_type: string | null;
  band: string | null;
  cell_id: string | null;
  pci: string | null;
  rsrp: number | null;
  rsrq: number | null;
  sinr: number | null;
  rssi: number | null;
}

export interface DeviceHistoryRow {
  timestamp: string;
  upload_bytes: number | null;
  download_bytes: number | null;
  delta_upload_bytes: number | null;
  delta_download_bytes: number | null;
  upload_bps: number | null;
  download_bps: number | null;
  rssi: number | null;
  device_name: string | null;
  device_ip: string | null;
}

export interface LatestTrafficOverviewRow {
  upload_bytes: number | null;
  download_bytes: number | null;
  connected_devices: number | null;
  signal_strength: number | null;
}

const TRAFFIC_COLUMNS = `
  timestamp, upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
  upload_bps, download_bps, connected_devices, signal_strength, network_type,
  band, cell_id, pci, rsrp, rsrq, sinr, rssi
`;

const DEVICE_COLUMNS = `
  timestamp, upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
  upload_bps, download_bps, rssi, device_name, device_ip
`;

export function findTrafficBefore(timestamp: string): TrafficHistoryRow | null {
  ensureDatabaseReady();
  return (db.prepare(
    `SELECT ${TRAFFIC_COLUMNS} FROM traffic_data
     WHERE timestamp < ? ORDER BY timestamp DESC LIMIT 1`,
  ).get(timestamp) as TrafficHistoryRow | undefined) || null;
}

export function listTrafficBetween(start: string, end: string): TrafficHistoryRow[] {
  ensureDatabaseReady();
  return db.prepare(
    `SELECT ${TRAFFIC_COLUMNS} FROM traffic_data
     WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp`,
  ).all(start, end) as TrafficHistoryRow[];
}

export function findDeviceHistoryBefore(mac: string, timestamp: string): DeviceHistoryRow | null {
  ensureDatabaseReady();
  return (db.prepare(
    `SELECT ${DEVICE_COLUMNS} FROM device_data
     WHERE device_mac = ? AND timestamp < ? ORDER BY timestamp DESC LIMIT 1`,
  ).get(mac, timestamp) as DeviceHistoryRow | undefined) || null;
}

export function listDeviceHistoryBetween(mac: string, start: string, end: string): DeviceHistoryRow[] {
  ensureDatabaseReady();
  return db.prepare(
    `SELECT ${DEVICE_COLUMNS} FROM device_data
     WHERE device_mac = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp`,
  ).all(mac, start, end) as DeviceHistoryRow[];
}

export function findLatestTrafficOverview(): LatestTrafficOverviewRow | null {
  ensureDatabaseReady();
  return (db.prepare(
    `SELECT upload_bytes, download_bytes, connected_devices, signal_strength
     FROM traffic_data ORDER BY timestamp DESC LIMIT 1`,
  ).get() as LatestTrafficOverviewRow | undefined) || null;
}
