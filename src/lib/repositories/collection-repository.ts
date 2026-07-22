import { db, ensureDatabaseReady } from '@/lib/db';

export interface CollectionTrafficSnapshot {
  uploadBytes: number;
  downloadBytes: number;
  deltaUploadBytes: number;
  deltaDownloadBytes: number;
  uploadBps: number;
  downloadBps: number;
  connectedDevices: number;
  signalStrength: number;
  networkType: string | null;
  band: string | null;
  cellId: string | null;
  pci: string | null;
  rsrp: number | null;
  rsrq: number | null;
  sinr: number | null;
  rssi: number | null;
  timestamp: string;
}

export interface CollectionRunSnapshot {
  id: number;
  source: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

export interface CollectionDeviceSnapshot {
  name: string;
  ip: string;
  mac: string;
  uploadBytes: number;
  downloadBytes: number;
  uploadBps: number;
  downloadBps: number;
  interfaceType: string;
  frequency: string;
  rssi: number | null;
}

interface TrafficRow {
  upload_bytes: number;
  download_bytes: number;
  delta_upload_bytes: number | null;
  delta_download_bytes: number | null;
  upload_bps: number | null;
  download_bps: number | null;
  connected_devices: number;
  signal_strength: number;
  network_type: string | null;
  band: string | null;
  cell_id: string | null;
  pci: string | null;
  rsrp: number | null;
  rsrq: number | null;
  sinr: number | null;
  rssi: number | null;
  timestamp: string;
}

interface RunRow {
  id: number;
  source: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface DeviceRow {
  device_name: string;
  device_ip: string;
  device_mac: string;
  delta_upload_bytes: number | null;
  delta_download_bytes: number | null;
  upload_bps: number | null;
  download_bps: number | null;
  interface_type: string | null;
  frequency: string | null;
  rssi: number | null;
}

export function getCollectionSnapshot(collectionId: number): {
  traffic: CollectionTrafficSnapshot | null;
  run: CollectionRunSnapshot | null;
  devices: CollectionDeviceSnapshot[];
} {
  ensureDatabaseReady();
  const traffic = db.prepare(`
    SELECT upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
           upload_bps, download_bps, connected_devices, signal_strength,
           network_type, band, cell_id, pci, rsrp, rsrq, sinr, rssi, timestamp
    FROM traffic_data WHERE collection_id = ? ORDER BY id DESC LIMIT 1
  `).get(collectionId) as TrafficRow | undefined;
  const run = db.prepare(`
    SELECT id, source, status, started_at, completed_at, error_message
    FROM collection_runs WHERE id = ?
  `).get(collectionId) as RunRow | undefined;
  const deviceRows = db.prepare(`
    SELECT device_name, device_ip, device_mac, delta_upload_bytes, delta_download_bytes,
           upload_bps, download_bps, interface_type, frequency, rssi
    FROM device_data WHERE collection_id = ?
    ORDER BY (COALESCE(delta_upload_bytes, 0) + COALESCE(delta_download_bytes, 0)) DESC
  `).all(collectionId) as DeviceRow[];

  return {
    traffic: traffic ? {
      uploadBytes: traffic.upload_bytes || 0,
      downloadBytes: traffic.download_bytes || 0,
      deltaUploadBytes: traffic.delta_upload_bytes || 0,
      deltaDownloadBytes: traffic.delta_download_bytes || 0,
      uploadBps: traffic.upload_bps || 0,
      downloadBps: traffic.download_bps || 0,
      connectedDevices: traffic.connected_devices || 0,
      signalStrength: traffic.signal_strength || 0,
      networkType: traffic.network_type,
      band: traffic.band,
      cellId: traffic.cell_id,
      pci: traffic.pci,
      rsrp: traffic.rsrp,
      rsrq: traffic.rsrq,
      sinr: traffic.sinr,
      rssi: traffic.rssi,
      timestamp: traffic.timestamp,
    } : null,
    run: run ? {
      id: run.id,
      source: run.source,
      status: run.status,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      errorMessage: run.error_message,
    } : null,
    devices: deviceRows.map((device) => ({
      name: device.device_name || device.device_ip || '未知设备',
      ip: device.device_ip || '',
      mac: device.device_mac || '',
      uploadBytes: device.delta_upload_bytes || 0,
      downloadBytes: device.delta_download_bytes || 0,
      uploadBps: device.upload_bps || 0,
      downloadBps: device.download_bps || 0,
      interfaceType: device.interface_type || '',
      frequency: device.frequency || '',
      rssi: device.rssi,
    })),
  };
}
