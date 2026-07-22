import { db, toSqliteTimestamp } from '@/lib/db';
import { ensureDatabase, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';

interface TrafficHistoryRow {
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

function parseSqliteTimestamp(value: string): number | null {
  const parsed = new Date(`${value.replace(' ', 'T')}Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function computeDelta(
  current: number | null,
  previous: number | null | undefined,
): number {
  if (current === null || previous === null || previous === undefined || current < previous) {
    return 0;
  }
  return current - previous;
}

function computeRate(
  deltaBytes: number,
  currentTime: number | null,
  previousTime: number | null,
): number {
  if (deltaBytes <= 0 || currentTime === null || previousTime === null) return 0;
  const elapsedSeconds = (currentTime - previousTime) / 1000;
  return elapsedSeconds > 0 ? (deltaBytes * 8) / elapsedSeconds : 0;
}

function getStartTime(range: string, now: Date): Date {
  switch (range) {
    case '1h':
      return new Date(now.getTime() - 60 * 60 * 1000);
    case '6h':
      return new Date(now.getTime() - 6 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '24h':
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

const SELECT_COLUMNS = `
  timestamp,
  upload_bytes,
  download_bytes,
  delta_upload_bytes,
  delta_download_bytes,
  upload_bps,
  download_bps,
  connected_devices,
  signal_strength,
  network_type,
  band,
  cell_id,
  pci,
  rsrp,
  rsrq,
  sinr,
  rssi
`;

export const GET = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '24h';
  const now = new Date();
  const startTime = getStartTime(range, now);
  const startTimestamp = toSqliteTimestamp(startTime);
  const endTimestamp = toSqliteTimestamp(now);

  const previous = db.prepare(
    `SELECT ${SELECT_COLUMNS}
     FROM traffic_data
     WHERE timestamp < ?
     ORDER BY timestamp DESC
     LIMIT 1`,
  ).get(startTimestamp) as TrafficHistoryRow | undefined;

  const rows = db.prepare(
    `SELECT ${SELECT_COLUMNS}
     FROM traffic_data
     WHERE timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp`,
  ).all(startTimestamp, endTimestamp) as TrafficHistoryRow[];

  let previousRow = previous;
  const data = rows.map((row) => {
    const currentTime = parseSqliteTimestamp(row.timestamp);
    const previousTime = previousRow ? parseSqliteTimestamp(previousRow.timestamp) : null;
    const uploadBytes = row.delta_upload_bytes
      ?? computeDelta(row.upload_bytes, previousRow?.upload_bytes);
    const downloadBytes = row.delta_download_bytes
      ?? computeDelta(row.download_bytes, previousRow?.download_bytes);
    const uploadBps = row.upload_bps
      ?? computeRate(uploadBytes, currentTime, previousTime);
    const downloadBps = row.download_bps
      ?? computeRate(downloadBytes, currentTime, previousTime);

    previousRow = row;
    return {
      timestamp: row.timestamp,
      uploadBytes,
      downloadBytes,
      uploadBps,
      downloadBps,
      connectedDevices: row.connected_devices,
      signalStrength: row.signal_strength,
      networkType: row.network_type,
      band: row.band,
      cellId: row.cell_id,
      pci: row.pci,
      rsrp: row.rsrp,
      rsrq: row.rsrq,
      sinr: row.sinr,
      rssi: row.rssi,
    };
  });

  return jsonOk(data);
}, '获取流量数据失败');
