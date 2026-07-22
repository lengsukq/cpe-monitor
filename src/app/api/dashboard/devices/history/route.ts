import { jsonError, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { parseTimestampMs, toSqliteTimestamp } from '@/lib/date-time';
import { findDeviceHistoryBefore, listDeviceHistoryBetween } from '@/lib/repositories/monitoring-repository';
import { bitsPerSecondBetweenTimestamps, computeCounterDelta } from '@/lib/traffic-units';

function getStartTime(range: string, now: Date): Date {
  const duration = range === '1h' ? 60 * 60 * 1000
    : range === '6h' ? 6 * 60 * 60 * 1000
      : range === '7d' ? 7 * 24 * 60 * 60 * 1000
        : range === '30d' ? 30 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - duration);
}

export const GET = withApiHandler(async (request) => {
  await requireSession();
  const params = new URL(request.url).searchParams;
  const mac = params.get('mac')?.trim() || '';
  const range = params.get('range') || '24h';
  if (!mac || mac.length > 64) return jsonError('缺少有效的设备 MAC 地址', 400);

  const now = new Date();
  const startTimestamp = toSqliteTimestamp(getStartTime(range, now));
  const endTimestamp = toSqliteTimestamp(now);
  let previousRow = findDeviceHistoryBefore(mac, startTimestamp);
  const points = listDeviceHistoryBetween(mac, startTimestamp, endTimestamp).map((row) => {
    const currentTime = parseTimestampMs(row.timestamp);
    const previousTime = parseTimestampMs(previousRow?.timestamp);
    const uploadBytes = row.delta_upload_bytes ?? computeCounterDelta(row.upload_bytes, previousRow?.upload_bytes);
    const downloadBytes = row.delta_download_bytes ?? computeCounterDelta(row.download_bytes, previousRow?.download_bytes);
    const uploadBps = row.upload_bps ?? bitsPerSecondBetweenTimestamps(uploadBytes, currentTime, previousTime);
    const downloadBps = row.download_bps ?? bitsPerSecondBetweenTimestamps(downloadBytes, currentTime, previousTime);
    previousRow = row;
    return { timestamp: row.timestamp, uploadBytes, downloadBytes, uploadBps, downloadBps, rssi: row.rssi, deviceName: row.device_name, deviceIp: row.device_ip };
  });
  const rssiValues = points.map((point) => point.rssi).filter((value): value is number => typeof value === 'number');
  return jsonOk({
    mac, range, points,
    summary: {
      sampleCount: points.length,
      totalUploadBytes: points.reduce((total, point) => total + point.uploadBytes, 0),
      totalDownloadBytes: points.reduce((total, point) => total + point.downloadBytes, 0),
      peakUploadBps: Math.max(0, ...points.map((point) => point.uploadBps)),
      peakDownloadBps: Math.max(0, ...points.map((point) => point.downloadBps)),
      averageRssi: rssiValues.length ? rssiValues.reduce((total, value) => total + value, 0) / rssiValues.length : null,
    },
  });
}, '获取设备历史数据失败');
