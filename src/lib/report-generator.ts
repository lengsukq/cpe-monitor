import { db } from './db';
import type { DailyReport, DeviceRanking } from '@/types';
import {
  getAppDateKey,
  getAppDayRange,
  getAppHour,
  parseDateTime,
  toSqliteTimestamp,
} from './date-time';
import {
  enumerateDateKeys,
  getMonthRange,
  getPeriodRangeByScope,
  getPreviousMonthRange,
  getPreviousWeekRange,
  getWeekRange,
  resolvePeriodDateRange,
  type PeriodDateRange,
  type PeriodReportScope,
  type PeriodReportType,
} from './period-report-range';
import { computeCounterDelta } from './traffic-units';

interface TrafficReportRow {
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
  rsrp: number | null;
  rsrq: number | null;
  sinr: number | null;
  rssi: number | null;
}

interface DeviceReportRow {
  timestamp: string;
  device_name: string | null;
  device_ip: string | null;
  device_mac: string | null;
  upload_bytes: number | null;
  download_bytes: number | null;
  delta_upload_bytes: number | null;
  delta_download_bytes: number | null;
}

function average(values: Array<number | null | undefined>): number | null {
  const available = values.filter((value): value is number => (
    typeof value === 'number' && Number.isFinite(value)
  ));
  if (available.length === 0) return null;
  return available.reduce((total, value) => total + value, 0) / available.length;
}

function getLocalHour(timestamp: string): number {
  return getAppHour(timestamp) ?? 0;
}

interface TrafficSummary {
  totalUpload: number;
  totalDownload: number;
  peakHour: number | null;
  peakTrafficBytes: number;
  networkTypes: string[];
  bands: string[];
}

function computeTrafficSummary(rows: TrafficReportRow[]): TrafficSummary {
  let totalUpload = 0;
  let totalDownload = 0;
  let previousRow: TrafficReportRow | undefined;
  const hourlyTraffic: Record<number, number> = {};
  const networkTypes = new Set<string>();
  const bands = new Set<string>();

  for (const row of rows) {
    const uploadDelta = row.delta_upload_bytes
      ?? computeCounterDelta(row.upload_bytes, previousRow?.upload_bytes);
    const downloadDelta = row.delta_download_bytes
      ?? computeCounterDelta(row.download_bytes, previousRow?.download_bytes);
    totalUpload += uploadDelta;
    totalDownload += downloadDelta;
    const hour = getLocalHour(row.timestamp);
    hourlyTraffic[hour] = (hourlyTraffic[hour] || 0) + uploadDelta + downloadDelta;
    if (row.network_type?.trim()) networkTypes.add(row.network_type.trim());
    if (row.band?.trim()) bands.add(row.band.trim());
    previousRow = row;
  }

  let peakHour: number | null = null;
  let peakTrafficBytes = 0;
  for (const [hour, bytes] of Object.entries(hourlyTraffic)) {
    if (bytes > peakTrafficBytes) {
      peakTrafficBytes = bytes;
      peakHour = Number(hour);
    }
  }

  return {
    totalUpload,
    totalDownload,
    peakHour,
    peakTrafficBytes,
    networkTypes: Array.from(networkTypes),
    bands: Array.from(bands),
  };
}

function computeDeviceRankings(rows: DeviceReportRow[]): DeviceRanking[] {
  const deviceMap = new Map<string, DeviceRanking & {
    previousUpload: number | null;
    previousDownload: number | null;
  }>();

  for (const row of rows) {
    const key = row.device_mac || row.device_ip || `unknown-${row.device_name || 'device'}`;
    const current = deviceMap.get(key) || {
      name: row.device_name || '未知设备',
      ip: row.device_ip || '',
      mac: row.device_mac || key,
      uploadBytes: 0,
      downloadBytes: 0,
      totalBytes: 0,
      previousUpload: null,
      previousDownload: null,
    };
    const uploadDelta = row.delta_upload_bytes
      ?? computeCounterDelta(row.upload_bytes, current.previousUpload);
    const downloadDelta = row.delta_download_bytes
      ?? computeCounterDelta(row.download_bytes, current.previousDownload);
    current.name = row.device_name || current.name;
    current.ip = row.device_ip || current.ip;
    current.mac = row.device_mac || current.mac;
    current.uploadBytes += uploadDelta;
    current.downloadBytes += downloadDelta;
    current.totalBytes = current.uploadBytes + current.downloadBytes;
    current.previousUpload = row.upload_bytes;
    current.previousDownload = row.download_bytes;
    deviceMap.set(key, current);
  }

  return Array.from(deviceMap.values())
    .map(({ name, ip, mac, uploadBytes, downloadBytes, totalBytes }) => ({
      name, ip, mac, uploadBytes, downloadBytes, totalBytes,
    }))
    .sort((left, right) => right.totalBytes - left.totalBytes)
    .slice(0, 10);
}

function computeNetworkQuality(
  sampleCount: number,
  qualitySignal: number | null,
  samplingRatio: number,
): string {
  if (sampleCount < 3 || qualitySignal === null) return '数据不足';
  if (qualitySignal >= -80 && samplingRatio >= 0.7) return '优秀';
  if (qualitySignal >= -95 && samplingRatio >= 0.5) return '良好';
  if (qualitySignal >= -105 && samplingRatio >= 0.3) return '一般';
  return '差';
}

export async function generateDailyReport(): Promise<DailyReport> {
  const now = new Date();
  const { dateKey: todayStr, start: today, end: tomorrow } = getAppDayRange(now);
  const todayIso = toSqliteTimestamp(today);
  const tomorrowIso = toSqliteTimestamp(tomorrow);

  const todayTraffic = db.prepare(
    `SELECT
       timestamp, upload_bytes, download_bytes,
       delta_upload_bytes, delta_download_bytes,
       upload_bps, download_bps,
       connected_devices, signal_strength,
       network_type, band, rsrp, rsrq, sinr, rssi
     FROM traffic_data
     WHERE timestamp >= ? AND timestamp < ?
     ORDER BY timestamp ASC`,
  ).all(todayIso, tomorrowIso) as TrafficReportRow[];

  const trafficSummary = computeTrafficSummary(todayTraffic);

  const todayDevices = db.prepare(
    `SELECT
       timestamp, device_name, device_ip, device_mac,
       upload_bytes, download_bytes,
       delta_upload_bytes, delta_download_bytes
     FROM device_data
     WHERE timestamp >= ? AND timestamp < ?
     ORDER BY device_mac, device_ip, timestamp ASC`,
  ).all(todayIso, tomorrowIso) as DeviceReportRow[];

  const topDevices = computeDeviceRankings(todayDevices);

  const intervalSetting = db.prepare(
    "SELECT value FROM system_settings WHERE key = 'scheduler_interval'",
  ).get() as { value?: string } | undefined;
  const intervalMinutes = Math.max(1, Number(intervalSetting?.value || 60));
  const elapsedMinutes = Math.min(
    24 * 60,
    Math.max(0, Math.ceil((now.getTime() - today.getTime()) / 60_000)),
  );
  const expectedSamples = Math.max(1, Math.ceil(elapsedMinutes / intervalMinutes));
  const samplingRatio = expectedSamples > 0
    ? Math.min(1, todayTraffic.length / expectedSamples)
    : 0;
  const uptimePercent = Math.round(samplingRatio * 1000) / 10;

  const collectionCounts = db.prepare(
    `SELECT status, COUNT(*) AS count
     FROM collection_runs
     WHERE COALESCE(completed_at, started_at) >= ?
       AND COALESCE(completed_at, started_at) < ?
     GROUP BY status`,
  ).all(todayIso, tomorrowIso) as Array<{ status: string; count: number }>;
  const countByStatus = Object.fromEntries(
    collectionCounts.map((row) => [row.status, Number(row.count || 0)]),
  );
  const alertCountRow = db.prepare(
    `SELECT COUNT(*) AS count
     FROM alert_logs
     WHERE triggered_at >= ? AND triggered_at < ?`,
  ).get(todayIso, tomorrowIso) as { count: number } | undefined;

  const avgSignalValue = average(todayTraffic.map((row) => row.signal_strength));
  const avgRsrp = average(todayTraffic.map((row) => row.rsrp));
  const avgRsrq = average(todayTraffic.map((row) => row.rsrq));
  const avgSinr = average(todayTraffic.map((row) => row.sinr));
  const avgRssi = average(todayTraffic.map((row) => row.rssi));
  const qualitySignal = avgRsrp ?? avgSignalValue;
  const networkQuality = computeNetworkQuality(todayTraffic.length, qualitySignal, samplingRatio);

  const connectedValues = todayTraffic
    .map((row) => row.connected_devices)
    .filter((value): value is number => typeof value === 'number');

  return {
    id: 0,
    reportDate: todayStr,
    totalUpload: trafficSummary.totalUpload,
    totalDownload: trafficSummary.totalDownload,
    peakHour: trafficSummary.peakHour,
    topDevices,
    avgSignal: avgSignalValue === null ? null : Math.round(avgSignalValue),
    uptimePercent,
    networkQuality,
    sentAt: null,
    createdAt: null,
    sampleCount: todayTraffic.length,
    expectedSamples,
    successfulCollections: countByStatus.success || 0,
    failedCollections: countByStatus.failed || 0,
    alertCount: Number(alertCountRow?.count || 0),
    peakTrafficBytes: trafficSummary.peakTrafficBytes,
    peakDownloadBps: Math.max(0, ...todayTraffic.map((row) => row.download_bps || 0)),
    peakUploadBps: Math.max(0, ...todayTraffic.map((row) => row.upload_bps || 0)),
    averageDevices: connectedValues.length > 0
      ? connectedValues.reduce((total, value) => total + value, 0) / connectedValues.length
      : 0,
    maxDevices: Math.max(0, ...connectedValues),
    avgRsrp,
    avgRsrq,
    avgSinr,
    avgRssi,
    networkTypes: trafficSummary.networkTypes,
    bands: trafficSummary.bands,
    generatedAt: now.toISOString(),
  };
}

// ─── Weekly / Monthly report generation ──────────────────────────────────

export {
  getMonthRange,
  getPreviousMonthRange,
  getPreviousWeekRange,
  getWeekRange,
  resolvePeriodDateRange,
};

export interface PeriodDailyBreakdownItem {
  date: string;
  upload: number;
  download: number;
  total: number;
  avgSignal: number | null;
  sampleCount: number;
}

export interface PeriodReportBreakdownSummary {
  startDate: string;
  endDate: string;
  dailyBreakdown: PeriodDailyBreakdownItem[];
  peakDay: string | null;
  peakDayTraffic: number;
  dayCount: number;
  totalDays: number;
  measuredUpload: number;
  measuredDownload: number;
}

export interface PeriodReport {
  periodType: PeriodReportType;
  periodKey: string; // e.g. '2024-W03' or '2024-01'
  startDate: string;
  endDate: string;
  totalUpload: number;
  totalDownload: number;
  dailyAvgUpload: number;
  dailyAvgDownload: number;
  peakDay: string | null;
  peakDayTraffic: number;
  avgSignal: number | null;
  networkQuality: string;
  topDevices: DeviceRanking[];
  dayCount: number;
  totalDays: number;
  dailyBreakdown: PeriodDailyBreakdownItem[];
  generatedAt: string;
}

function summarizePeriodTrafficDays(
  trafficRows: TrafficReportRow[],
  range: PeriodDateRange,
  initialPrevRow?: TrafficReportRow,
): PeriodReportBreakdownSummary {
  const dailyMap = new Map<string, {
    upload: number;
    download: number;
    signals: number[];
    sampleCount: number;
  }>();
  let prevRow: TrafficReportRow | undefined = initialPrevRow;

  for (const row of trafficRows) {
    const parsed = parseDateTime(row.timestamp);
    const dayKey = parsed ? getAppDateKey(parsed) : row.timestamp.slice(0, 10);
    const upDelta = row.delta_upload_bytes ?? computeCounterDelta(row.upload_bytes, prevRow?.upload_bytes);
    const downDelta = row.delta_download_bytes ?? computeCounterDelta(row.download_bytes, prevRow?.download_bytes);
    const entry = dailyMap.get(dayKey) || { upload: 0, download: 0, signals: [], sampleCount: 0 };
    entry.upload += upDelta;
    entry.download += downDelta;
    entry.sampleCount += 1;
    if (typeof row.signal_strength === 'number' && Number.isFinite(row.signal_strength)) {
      entry.signals.push(row.signal_strength);
    }
    dailyMap.set(dayKey, entry);
    prevRow = row;
  }

  const allDateKeys = enumerateDateKeys(range.startDate, range.endDate);
  const keys = allDateKeys.length > 0 ? allDateKeys : Array.from(dailyMap.keys()).sort();

  let peakDay: string | null = null;
  let peakDayTraffic = 0;
  let measuredUpload = 0;
  let measuredDownload = 0;
  let dayCount = 0;

  const dailyBreakdown: PeriodDailyBreakdownItem[] = keys.map((date) => {
    const bucket = dailyMap.get(date);
    if (!bucket || bucket.sampleCount === 0) {
      return {
        date,
        upload: 0,
        download: 0,
        total: 0,
        avgSignal: null,
        sampleCount: 0,
      };
    }

    dayCount += 1;
    const total = bucket.upload + bucket.download;
    measuredUpload += bucket.upload;
    measuredDownload += bucket.download;
    if (total > peakDayTraffic) {
      peakDayTraffic = total;
      peakDay = date;
    }

    const avgSignal = bucket.signals.length > 0
      ? Math.round(bucket.signals.reduce((acc, value) => acc + value, 0) / bucket.signals.length)
      : null;

    return {
      date,
      upload: bucket.upload,
      download: bucket.download,
      total,
      avgSignal,
      sampleCount: bucket.sampleCount,
    };
  });

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    dailyBreakdown,
    peakDay,
    peakDayTraffic,
    dayCount,
    totalDays: keys.length || 1,
    measuredUpload,
    measuredDownload,
  };
}

export function buildPeriodBreakdownForKey(
  periodType: PeriodReportType,
  periodKey: string,
): PeriodReportBreakdownSummary | null {
  const range = resolvePeriodDateRange(periodType, periodKey);
  if (!range) return null;
  const startIso = toSqliteTimestamp(range.start);
  const endIso = toSqliteTimestamp(range.end);

  const prevRow = db.prepare(
    `SELECT timestamp, upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
            upload_bps, download_bps, connected_devices, signal_strength,
            network_type, band, rsrp, rsrq, sinr, rssi
     FROM traffic_data WHERE timestamp < ? ORDER BY timestamp DESC LIMIT 1`,
  ).get(startIso) as TrafficReportRow | undefined;

  const trafficRows = db.prepare(
    `SELECT timestamp, upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
            upload_bps, download_bps, connected_devices, signal_strength,
            network_type, band, rsrp, rsrq, sinr, rssi
     FROM traffic_data WHERE timestamp >= ? AND timestamp < ? ORDER BY timestamp ASC`,
  ).all(startIso, endIso) as TrafficReportRow[];

  return summarizePeriodTrafficDays(trafficRows, range, prevRow);
}

function generatePeriodReport(periodType: PeriodReportType, range: PeriodDateRange): PeriodReport {
  const startIso = toSqliteTimestamp(range.start);
  const endIso = toSqliteTimestamp(range.end);

  const prevRow = db.prepare(
    `SELECT timestamp, upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
            upload_bps, download_bps, connected_devices, signal_strength,
            network_type, band, rsrp, rsrq, sinr, rssi
     FROM traffic_data WHERE timestamp < ? ORDER BY timestamp DESC LIMIT 1`,
  ).get(startIso) as TrafficReportRow | undefined;

  const trafficRows = db.prepare(
    `SELECT timestamp, upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
            upload_bps, download_bps, connected_devices, signal_strength,
            network_type, band, rsrp, rsrq, sinr, rssi
     FROM traffic_data WHERE timestamp >= ? AND timestamp < ? ORDER BY timestamp ASC`,
  ).all(startIso, endIso) as TrafficReportRow[];

  const deviceRows = db.prepare(
    `SELECT timestamp, device_name, device_ip, device_mac, upload_bytes, download_bytes,
            delta_upload_bytes, delta_download_bytes
     FROM device_data WHERE timestamp >= ? AND timestamp < ? ORDER BY device_mac, device_ip, timestamp ASC`,
  ).all(startIso, endIso) as DeviceReportRow[];

  const summary = computeTrafficSummary(trafficRows);
  const topDevices = computeDeviceRankings(deviceRows);
  const breakdown = summarizePeriodTrafficDays(trafficRows, range, prevRow);

  const activeDays = Math.max(1, breakdown.dayCount);
  const avgSignal = average(trafficRows.map((r) => r.signal_strength));
  const avgRsrp = average(trafficRows.map((r) => r.rsrp));
  const qualitySignal = avgRsrp ?? avgSignal;
  const samplingRatio = Math.min(1, breakdown.dayCount / Math.max(1, breakdown.totalDays));
  const networkQuality = computeNetworkQuality(trafficRows.length, qualitySignal, samplingRatio);

  return {
    periodType,
    periodKey: range.key,
    startDate: range.startDate,
    endDate: range.endDate,
    totalUpload: summary.totalUpload,
    totalDownload: summary.totalDownload,
    dailyAvgUpload: Math.round(summary.totalUpload / activeDays),
    dailyAvgDownload: Math.round(summary.totalDownload / activeDays),
    peakDay: breakdown.peakDay,
    peakDayTraffic: breakdown.peakDayTraffic,
    avgSignal: avgSignal === null ? null : Math.round(avgSignal),
    networkQuality,
    topDevices,
    dayCount: breakdown.dayCount,
    totalDays: breakdown.totalDays,
    dailyBreakdown: breakdown.dailyBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

export function generatePeriodReportByScope(
  periodType: PeriodReportType,
  scope: PeriodReportScope = 'previous',
  forDate?: Date,
): PeriodReport {
  const now = forDate || new Date();
  return generatePeriodReport(periodType, getPeriodRangeByScope(periodType, scope, now));
}

export function generateWeeklyReport(forDate?: Date): PeriodReport {
  return generatePeriodReportByScope('weekly', 'previous', forDate);
}

export function generateMonthlyReport(forDate?: Date): PeriodReport {
  return generatePeriodReportByScope('monthly', 'previous', forDate);
}
