import { db } from '@/lib/db';
import { ensureDatabase, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { formatBytes } from '@/lib/format';
import { generateDailyReport } from '@/lib/report-generator';
import { mapDailyReportRows, type DailyReportRow } from '@/lib/mappers/daily-report';
import { readNotificationConfig } from '@/lib/settings-store';
import { sendDailyReport } from '@/lib/notifiers/email';
import { sendDailyReportWechat } from '@/lib/notifiers/wechat';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  const reports = db.prepare(
    'SELECT * FROM daily_reports ORDER BY report_date DESC LIMIT 30',
  ).all() as DailyReportRow[];
  return jsonOk(mapDailyReportRows(reports));
}, '获取报告列表失败');

export const POST = withApiHandler(async () => {
  await requireSession();

  // 1. Generate the report
  const report = await generateDailyReport();

  // 2. Save to database
  db.prepare(
    'INSERT INTO daily_reports (report_date, total_upload, total_download, peak_hour, top_devices, avg_signal, uptime_percent, network_quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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

  // 3. Send notifications if configured
  const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  const emailConfig = readNotificationConfig('email');
  const wechatConfig = readNotificationConfig('wechat');
  const emailConfigured = Boolean(emailConfig);
  const wechatConfigured = Boolean(wechatConfig?.webhookUrl);
  let emailSent = false;
  let wechatSent = false;

  if (emailConfig) {
    emailSent = await sendDailyReport(emailConfig, report);
  }
  if (wechatConfig?.webhookUrl) {
    wechatSent = await sendDailyReportWechat(wechatConfig, {
      date: report.reportDate,
      totalDownload: formatBytes(report.totalDownload),
      totalUpload: formatBytes(report.totalUpload),
      deviceCount: report.topDevices?.length || 0,
      networkQuality: report.networkQuality,
      avgSignal: report.avgSignal,
    });
  }

  if (emailSent || wechatSent) {
    db.prepare('UPDATE daily_reports SET sent_at = ? WHERE report_date = ?').run(timestamp, report.reportDate);
  }

  return jsonOk({
    ...report,
    notifications: {
      emailConfigured,
      wechatConfigured,
      emailSent,
      wechatSent,
    },
  });
}, '生成报告失败');
