import { db, toSqliteTimestamp } from '@/lib/db';
import {
  ensureDatabase,
  jsonError,
  jsonOk,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';

interface DeviceHistoryRow {
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

function parseTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(`${value.replace(' ', 'T')}Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getDelta(current: number | null, previous: number | null | undefined): number {
  if (current === null || previous === null || previous === undefined || current < previous) {
    return 0;
  }
  return current - previous;
}

function getRate(deltaBytes: number, currentTime: number | null, previousTime: number | null) {
  if (deltaBytes <= 0 || currentTime === null || previousTime === null) return 0;
  const elapsedSeconds = (currentTime - previousTime) / 1000;
  return elapsedSeconds > 0 ? (deltaBytes * 8) / elapsedSeconds : 0;
}

const SELECT_COLUMNS = `
  timestamp,
  upload_bytes,
  download_bytes,
  delta_upload_bytes,
  delta_download_bytes,
  upload_bps,
  download_bps,
  rssi,
  device_name,
  device_ip
`;

export const GET = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();

  const { searchParams } = new URL(request.url);
  const mac = searchParams.get('mac')?.trim() || '';
  const range = searchParams.get('range') || '24h';

  if (!mac || mac.length > 64) {
    return jsonError('缺少有效的设备 MAC 地址', 400);
  }

  const now = new Date();
  const startTimestamp = toSqliteTimestamp(getStartTime(range, now));
  const endTimestamp = toSqliteTimestamp(now);

  const previous = db.prepare(
    `SELECT ${SELECT_COLUMNS}
     FROM device_data
     WHERE device_mac = ? AND timestamp < ?
     ORDER BY timestamp DESC
     LIMIT 1`,
  ).get(mac, startTimestamp) as DeviceHistoryRow | undefined;

  const rows = db.prepare(
    `SELECT ${SELECT_COLUMNS}
     FROM device_data
     WHERE device_mac = ? AND timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp`,
  ).all(mac, startTimestamp, endTimestamp) as DeviceHistoryRow[];

  let previousRow = previous;
  const points = rows.map((row) => {
    const currentTime = parseTimestamp(row.timestamp);
    const previousTime = parseTimestamp(previousRow?.timestamp);
    const uploadBytes = row.delta_upload_bytes
      ?? getDelta(row.upload_bytes, previousRow?.upload_bytes);
    const downloadBytes = row.delta_download_bytes
      ?? getDelta(row.download_bytes, previousRow?.download_bytes);
    const uploadBps = row.upload_bps ?? getRate(uploadBytes, currentTime, previousTime);
    const downloadBps = row.download_bps ?? getRate(downloadBytes, currentTime, previousTime);

    previousRow = row;
    return {
      timestamp: row.timestamp,
      uploadBytes,
      downloadBytes,
      uploadBps,
      downloadBps,
      rssi: row.rssi,
      deviceName: row.device_name,
      deviceIp: row.device_ip,
    };
  });

  return jsonOk({
    mac,
    range,
    points,
    summary: {
      sampleCount: points.length,
      totalUploadBytes: points.reduce((total, point) => total + point.uploadBytes, 0),
      totalDownloadBytes: points.reduce((total, point) => total + point.downloadBytes, 0),
      peakUploadBps: Math.max(0, ...points.map((point) => point.uploadBps)),
      peakDownloadBps: Math.max(0, ...points.map((point) => point.downloadBps)),
      averageRssi: (() => {
        const values = points
          .map((point) => point.rssi)
          .filter((value): value is number => typeof value === 'number');
        if (values.length === 0) return null;
        return values.reduce((total, value) => total + value, 0) / values.length;
      })(),
    },
  });
}, '获取设备历史数据失败');
