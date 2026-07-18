import { db, toSqliteTimestamp } from '@/lib/db';
import { ensureDatabase, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';

interface TrafficHistoryRow {
  timestamp: string;
  upload_bytes: number | null;
  download_bytes: number | null;
  connected_devices: number | null;
  signal_strength: number | null;
}

export const GET = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '24h';
  const now = new Date();
  let startTime: Date;

  switch (range) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '6h':
      startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '24h':
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const data = db.prepare(
    'SELECT timestamp, upload_bytes, download_bytes, connected_devices, signal_strength FROM traffic_data WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp',
  ).all(toSqliteTimestamp(startTime), toSqliteTimestamp(now)) as TrafficHistoryRow[];

  return jsonOk(data.map((row) => ({
    timestamp: row.timestamp,
    uploadBytes: row.upload_bytes,
    downloadBytes: row.download_bytes,
    connectedDevices: row.connected_devices,
    signalStrength: row.signal_strength,
  })));
}, '获取流量数据失败');
