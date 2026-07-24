import type { DailyReport } from '@/types';
import { mapDailyReportRows, type DailyReportRow } from '@/lib/mappers/daily-report';
import { db, ensureDatabaseReady } from '@/lib/db';
import { toSqliteTimestamp } from '@/lib/date-time';
import type { PeriodReport } from '@/lib/report-generator';

export function upsertDailyReport(report: DailyReport): void {
  ensureDatabaseReady();
  db.prepare(
    `INSERT INTO daily_reports (
       report_date,
       total_upload,
       total_download,
       peak_hour,
       top_devices,
       avg_signal,
       uptime_percent,
       network_quality
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(report_date) DO UPDATE SET
       total_upload = excluded.total_upload,
       total_download = excluded.total_download,
       peak_hour = excluded.peak_hour,
       top_devices = excluded.top_devices,
       avg_signal = excluded.avg_signal,
       uptime_percent = excluded.uptime_percent,
       network_quality = excluded.network_quality,
       created_at = datetime('now')`,
  ).run(
    report.reportDate,
    report.totalUpload,
    report.totalDownload,
    report.peakHour,
    JSON.stringify(report.topDevices || []),
    report.avgSignal,
    report.uptimePercent,
    report.networkQuality,
  );
}

export function markDailyReportSent(reportDate: string, sentAt = new Date()): void {
  ensureDatabaseReady();
  db.prepare(
    'UPDATE daily_reports SET sent_at = ? WHERE report_date = ?',
  ).run(toSqliteTimestamp(sentAt), reportDate);
}

export function listRecentDailyReports(limit = 30): DailyReport[] {
  ensureDatabaseReady();
  const safeLimit = Math.min(365, Math.max(1, Math.floor(limit)));
  const rows = db.prepare(
    "SELECT * FROM daily_reports WHERE period_type = 'daily' ORDER BY report_date DESC LIMIT ?",
  ).all(safeLimit) as DailyReportRow[];
  return mapDailyReportRows(rows);
}

// ─── Period reports (weekly / monthly) ────────────────────────────────────

export function upsertPeriodReport(report: PeriodReport): void {
  ensureDatabaseReady();
  db.prepare(
    `INSERT INTO daily_reports (
       report_date, period_type, total_upload, total_download,
       peak_hour, top_devices, avg_signal, uptime_percent, network_quality
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(report_date, period_type) DO UPDATE SET
       total_upload = excluded.total_upload,
       total_download = excluded.total_download,
       peak_hour = excluded.peak_hour,
       top_devices = excluded.top_devices,
       avg_signal = excluded.avg_signal,
       uptime_percent = excluded.uptime_percent,
       network_quality = excluded.network_quality,
       created_at = datetime('now')`,
  ).run(
    report.periodKey,
    report.periodType,
    report.totalUpload,
    report.totalDownload,
    null, // peak_hour not applicable for period reports
    JSON.stringify(report.topDevices || []),
    report.avgSignal,
    null,
    report.networkQuality,
  );
}

export interface PeriodReportRow {
  id: number;
  report_date: string;
  period_type: string;
  total_upload: number | null;
  total_download: number | null;
  top_devices: string | null;
  avg_signal: number | null;
  network_quality: string | null;
  created_at: string | null;
}

export function listPeriodReports(periodType: 'weekly' | 'monthly', limit = 20): PeriodReportRow[] {
  ensureDatabaseReady();
  return db.prepare(
    'SELECT * FROM daily_reports WHERE period_type = ? ORDER BY report_date DESC LIMIT ?',
  ).all(periodType, limit) as PeriodReportRow[];
}
