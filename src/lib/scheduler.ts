/**
 * Scheduler — orchestration layer for traffic collection, daily reports,
 * SMS sync, and device info sync scheduling.
 *
 * SMS and device-info sync logic lives in dedicated modules; this file
 * re-exports their public API for backward compatibility and coordinates
 * the traffic-collection cron and daily report generation.
 */
import cron, { type ScheduledTask } from 'node-cron';
import { initializeDatabase } from './db';
import { generateDailyReport, generateWeeklyReport, generateMonthlyReport } from './report-generator';
import { formatBytes } from './format';
import { sendDailyReport } from './notifiers/email';
import { sendDailyReportWechat } from './notifiers/wechat';
import { getSettingsMap, readNotificationConfig } from './settings-store';
import { checkAlerts } from './alert-service';
import { collectTrafficData } from './traffic-collection-service';
import { APP_TIME_ZONE } from './date-time';
import { markDailyReportSent, upsertDailyReport, upsertPeriodReport } from './repositories/report-repository';
import { ensureSmsSchedulerStarted } from './sms-sync-scheduler';
import { ensureDeviceInfoSchedulerStarted } from './device-info-sync-scheduler';
import { writeSystemLog } from './system-log';

// ─── Re-exports for backward compatibility ──────────────────────────────
export { checkAlerts } from './alert-service';
export { collectTrafficData } from './traffic-collection-service';
export { collectDeviceInfo } from './device-info-collection-service';
export type { DeviceInfoCollectionResult } from './device-info-collection-service';

export {
  SMS_SYNC_MIN_INTERVAL,
  SMS_SYNC_MAX_INTERVAL,
  SMS_SYNC_DEFAULT_INTERVAL,
  getSmsSyncStatus,
  isValidSmsSyncInterval,
  restartSmsScheduler,
  stopSmsScheduler,
  ensureSmsSchedulerStarted,
  syncSmsMessages,
} from './sms-sync-scheduler';
export type { SmsSyncStatus, SmsSyncResult } from './sms-sync-scheduler';

export {
  DEVICE_INFO_SYNC_MIN_INTERVAL,
  DEVICE_INFO_SYNC_MAX_INTERVAL,
  DEVICE_INFO_SYNC_DEFAULT_INTERVAL,
  getDeviceInfoSyncStatus,
  isValidDeviceInfoSyncInterval,
  restartDeviceInfoScheduler,
  stopDeviceInfoScheduler,
  ensureDeviceInfoSchedulerStarted,
  syncDeviceInfo,
} from './device-info-sync-scheduler';
export type { DeviceInfoSyncStatus } from './device-info-sync-scheduler';

// ─── Traffic collection & daily report scheduling ───────────────────────

let hourlyTask: ScheduledTask | null = null;
let dailyTask: ScheduledTask | null = null;
let weeklyTask: ScheduledTask | null = null;
let monthlyTask: ScheduledTask | null = null;

export function getSchedulerStatus(): { running: boolean } {
  return { running: hourlyTask !== null };
}

export function stopScheduler(): void {
  if (hourlyTask) { hourlyTask.stop(); hourlyTask = null; }
  if (dailyTask) { dailyTask.stop(); dailyTask = null; }
  if (weeklyTask) { weeklyTask.stop(); weeklyTask = null; }
  if (monthlyTask) { monthlyTask.stop(); monthlyTask = null; }
}

export async function startScheduler(): Promise<void> {
  initializeDatabase();
  const settingsMap = getSettingsMap();
  const enabled = settingsMap.scheduler_enabled === 'true';

  if (!enabled) {
    stopScheduler();
  } else {
    const interval = parseInt(settingsMap.scheduler_interval || '60', 10);
    stopScheduler();

    const cronExpression = interval <= 5
      ? '*/5 * * * *'
      : interval <= 15
        ? '*/15 * * * *'
        : interval <= 30
          ? '*/30 * * * *'
          : '0 * * * *';

    hourlyTask = cron.schedule(
      cronExpression,
      async () => {
        console.log('Running traffic collection...');
        writeSystemLog('info', `定时采集开始 (interval: ${interval}min)`);
        await collectTrafficData();
        await checkAlerts();
      },
      { timezone: APP_TIME_ZONE },
    );

    dailyTask = cron.schedule(
      '0 22 * * *',
      async () => {
        console.log('Generating daily report...');
        await generateAndSendDailyReport();
      },
      { timezone: APP_TIME_ZONE },
    );

    // Weekly report: Sunday 22:30
    weeklyTask = cron.schedule(
      '30 22 * * 0',
      () => {
        console.log('Generating weekly report...');
        generateAndStoreWeeklyReport();
      },
      { timezone: APP_TIME_ZONE },
    );

    // Monthly report: 1st of month 00:30
    monthlyTask = cron.schedule(
      '30 0 1 * *',
      () => {
        console.log('Generating monthly report...');
        generateAndStoreMonthlyReport();
      },
      { timezone: APP_TIME_ZONE },
    );

    console.log(`Scheduler started with interval: ${interval} minutes`);
    writeSystemLog('info', `调度器已启动，采集间隔 ${interval} 分钟`);
  }

  await ensureSmsSchedulerStarted();
  await ensureDeviceInfoSchedulerStarted();
}

export async function ensureSchedulerStarted(): Promise<void> {
  initializeDatabase();
  const settings = getSettingsMap();

  if (settings.scheduler_enabled === 'true' && !getSchedulerStatus().running) {
    await startScheduler();
    return;
  }

  if (settings.scheduler_enabled !== 'true' && getSchedulerStatus().running) {
    stopScheduler();
  }

  await ensureSmsSchedulerStarted();
  await ensureDeviceInfoSchedulerStarted();
}

// ─── Daily Report ───────────────────────────────────────────────────────

async function generateAndSendDailyReport(): Promise<void> {
  try {
    const report = await generateDailyReport();
    upsertDailyReport(report);
    const emailConfig = readNotificationConfig('email');
    const wechatConfig = readNotificationConfig('wechat');
    let sent = false;
    if (emailConfig) sent = await sendDailyReport(emailConfig, report) || sent;
    if (wechatConfig?.webhookUrl) {
      sent = await sendDailyReportWechat(wechatConfig, {
        date: report.reportDate,
        totalDownload: formatBytes(report.totalDownload),
        totalUpload: formatBytes(report.totalUpload),
        deviceCount: report.topDevices?.length || 0,
        networkQuality: report.networkQuality || '数据不足',
        avgSignal: report.avgSignal || 0,
      }) || sent;
    }
    if (sent) markDailyReportSent(report.reportDate);

    console.log('Daily report generated and stored');
    writeSystemLog('info', `日报生成完成: ${report.reportDate}`);
  } catch (error) {
    console.error('Failed to generate daily report:', error);
  }
}

function generateAndStoreWeeklyReport(): void {
  try {
    const report = generateWeeklyReport();
    upsertPeriodReport(report);
    writeSystemLog('info', `周报生成完成: ${report.periodKey}`);
    console.log('Weekly report generated:', report.periodKey);
  } catch (error) {
    console.error('Failed to generate weekly report:', error);
  }
}

function generateAndStoreMonthlyReport(): void {
  try {
    const report = generateMonthlyReport();
    upsertPeriodReport(report);
    writeSystemLog('info', `月报生成完成: ${report.periodKey}`);
    console.log('Monthly report generated:', report.periodKey);
  } catch (error) {
    console.error('Failed to generate monthly report:', error);
  }
}
