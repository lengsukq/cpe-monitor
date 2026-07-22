import type { DailyReport, DeviceRanking } from '@/types';
import { parseDateTime } from '@/lib/date-time';

export interface DailyReportRow {
  id: number;
  report_date: string;
  total_upload: number | null;
  total_download: number | null;
  peak_hour: number | null;
  top_devices: string | null;
  avg_signal: number | null;
  uptime_percent: number | null;
  network_quality: string | null;
  sent_at: string | null;
  created_at: string | null;
}

function parseTopDevices(raw: string | null): DeviceRanking[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DeviceRanking[]) : null;
  } catch (error) {
    console.error('Failed to parse daily report top_devices', error);
    return null;
  }
}

export function mapDailyReportRow(row: DailyReportRow): DailyReport {
  return {
    id: row.id,
    reportDate: row.report_date,
    totalUpload: row.total_upload,
    totalDownload: row.total_download,
    peakHour: row.peak_hour,
    topDevices: parseTopDevices(row.top_devices),
    avgSignal: row.avg_signal,
    uptimePercent: row.uptime_percent,
    networkQuality: row.network_quality,
    sentAt: parseDateTime(row.sent_at),
    createdAt: parseDateTime(row.created_at),
  };
}

export function mapDailyReportRows(rows: DailyReportRow[]): DailyReport[] {
  return rows.map(mapDailyReportRow);
}
