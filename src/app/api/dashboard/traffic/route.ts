import { ApiError, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import {
  parseAppDateKeyRange,
  parseDateTime,
  parseTimestampMs,
  toSqliteTimestamp,
} from '@/lib/date-time';
import { findTrafficBefore, listTrafficBetween } from '@/lib/repositories/monitoring-repository';
import { bitsPerSecondBetweenTimestamps, computeCounterDelta } from '@/lib/traffic-units';

function getStartTime(range: string, now: Date): Date {
  const duration = range === '1h' ? 60 * 60 * 1000
    : range === '6h' ? 6 * 60 * 60 * 1000
      : range === '7d' ? 7 * 24 * 60 * 60 * 1000
        : range === '30d' ? 30 * 24 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - duration);
}

function resolveTrafficWindow(searchParams: URLSearchParams, now: Date): { start: Date; end: Date } {
  const range = searchParams.get('range') || '24h';
  if (range !== 'custom') {
    return { start: getStartTime(range, now), end: now };
  }

  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const keyRange = parseAppDateKeyRange(startParam, endParam);
  if (keyRange) {
    return keyRange;
  }

  const parsedStart = parseDateTime(startParam);
  const parsedEnd = parseDateTime(endParam);
  if (!parsedStart || !parsedEnd || parsedEnd < parsedStart) {
    throw new ApiError('自定义时间范围无效，请提供有效的开始与结束日期', 400);
  }
  return { start: parsedStart, end: parsedEnd };
}

export const GET = withApiHandler(async (request) => {
  await requireSession();
  const searchParams = new URL(request.url).searchParams;
  const { start, end } = resolveTrafficWindow(searchParams, new Date());
  const startTimestamp = toSqliteTimestamp(start);
  const endTimestamp = toSqliteTimestamp(end);
  let previousRow = findTrafficBefore(startTimestamp);
  const data = listTrafficBetween(startTimestamp, endTimestamp).map((row) => {
    const currentTime = parseTimestampMs(row.timestamp);
    const previousTime = parseTimestampMs(previousRow?.timestamp);
    const uploadBytes = row.delta_upload_bytes ?? computeCounterDelta(row.upload_bytes, previousRow?.upload_bytes);
    const downloadBytes = row.delta_download_bytes ?? computeCounterDelta(row.download_bytes, previousRow?.download_bytes);
    const uploadBps = row.upload_bps ?? bitsPerSecondBetweenTimestamps(uploadBytes, currentTime, previousTime);
    const downloadBps = row.download_bps ?? bitsPerSecondBetweenTimestamps(downloadBytes, currentTime, previousTime);
    previousRow = row;
    return {
      timestamp: row.timestamp, uploadBytes, downloadBytes, uploadBps, downloadBps,
      connectedDevices: row.connected_devices, signalStrength: row.signal_strength,
      networkType: row.network_type, band: row.band, cellId: row.cell_id, pci: row.pci,
      rsrp: row.rsrp, rsrq: row.rsrq, sinr: row.sinr, rssi: row.rssi,
    };
  });
  return jsonOk(data);
}, '获取流量数据失败');
