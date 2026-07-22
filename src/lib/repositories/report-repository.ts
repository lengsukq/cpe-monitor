import type { DailyReport } from '@/types';
import { db, ensureDatabaseReady } from '@/lib/db';
import { toSqliteTimestamp } from '@/lib/date-time';

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
