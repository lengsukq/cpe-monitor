import cron, { ScheduledTask } from 'node-cron';
import crypto from 'crypto';
import { db, initializeDatabase } from './db';
import { getOrCreateCpeClient } from './cpe-client';
import { generateDailyReport } from './report-generator';
import { formatBytes } from './format';
import { sendDailyReport, sendSmsNotification } from './notifiers/email';
import { sendDailyReportWechat, sendSmsWechat } from './notifiers/wechat';
import {
  getSettingsMap,
  readNotificationConfig,
  setSetting,
} from './settings-store';
import { checkAlerts } from './alert-service';
export { checkAlerts } from './alert-service';
import { collectTrafficData } from './traffic-collection-service';
export { collectTrafficData } from './traffic-collection-service';
import {
  collectDeviceInfo,
  type DeviceInfoCollectionResult,
} from './device-info-collection-service';
export { collectDeviceInfo } from './device-info-collection-service';
import { APP_TIME_ZONE } from './date-time';
import {
  markDailyReportSent,
  upsertDailyReport,
} from './repositories/report-repository';

export const SMS_SYNC_MIN_INTERVAL = 1;
export const SMS_SYNC_MAX_INTERVAL = 1440;
export const DEVICE_INFO_SYNC_MIN_INTERVAL = 30;
export const DEVICE_INFO_SYNC_MAX_INTERVAL = 10080;
export const DEVICE_INFO_SYNC_DEFAULT_INTERVAL = 360;

export interface SmsSyncStatus {
  enabled: boolean;
  interval: number;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface SmsSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  notificationsSent: number;
  firstSync: boolean;
  syncedAt: string;
}

export interface DeviceInfoSyncStatus {
  enabled: boolean;
  interval: number;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

let hourlyTask: ScheduledTask | null = null;
let dailyTask: ScheduledTask | null = null;
let smsSyncTask: ReturnType<typeof setInterval> | null = null;
let smsSyncPromise: Promise<SmsSyncResult> | null = null;
let deviceInfoSyncTask: ReturnType<typeof setInterval> | null = null;
let deviceInfoSyncPromise: Promise<DeviceInfoCollectionResult> | null = null;

function getSmsSyncInterval(value: string | undefined): number {
  const interval = Number(value || 15);
  if (!Number.isInteger(interval)) return 15;
  return Math.min(SMS_SYNC_MAX_INTERVAL, Math.max(SMS_SYNC_MIN_INTERVAL, interval));
}

function getDeviceInfoSyncInterval(value: string | undefined): number {
  const interval = Number(value || DEVICE_INFO_SYNC_DEFAULT_INTERVAL);
  if (!Number.isInteger(interval)) return DEVICE_INFO_SYNC_DEFAULT_INTERVAL;
  return Math.min(
    DEVICE_INFO_SYNC_MAX_INTERVAL,
    Math.max(DEVICE_INFO_SYNC_MIN_INTERVAL, interval),
  );
}

function updateSmsSyncMetadata(lastSyncedAt: string | null, lastError: string | null) {
  if (lastSyncedAt !== null) setSetting('sms_last_sync_at', lastSyncedAt);
  if (lastError !== null) setSetting('sms_last_sync_error', lastError);
}

function updateDeviceInfoSyncMetadata(lastSyncedAt: string | null, lastError: string | null) {
  if (lastSyncedAt !== null) setSetting('device_info_last_sync_at', lastSyncedAt);
  if (lastError !== null) setSetting('device_info_last_sync_error', lastError);
}

export function getSmsSyncStatus(): SmsSyncStatus {
  initializeDatabase();
  const settings = getSettingsMap();
  const lastSyncedAt = settings.sms_last_sync_at || null;
  const lastError = settings.sms_last_sync_error || null;

  return {
    enabled: settings.sms_sync_enabled !== 'false',
    interval: getSmsSyncInterval(settings.sms_sync_interval),
    running: smsSyncTask !== null,
    lastSyncedAt,
    lastError,
  };
}

export function getDeviceInfoSyncStatus(): DeviceInfoSyncStatus {
  initializeDatabase();
  const settings = getSettingsMap();
  return {
    enabled: settings.device_info_sync_enabled !== 'false',
    interval: getDeviceInfoSyncInterval(settings.device_info_sync_interval),
    running: deviceInfoSyncTask !== null,
    lastSyncedAt: settings.device_info_last_sync_at || null,
    lastError: settings.device_info_last_sync_error || null,
  };
}

export function isValidSmsSyncInterval(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= SMS_SYNC_MIN_INTERVAL
    && value <= SMS_SYNC_MAX_INTERVAL;
}

export function isValidDeviceInfoSyncInterval(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= DEVICE_INFO_SYNC_MIN_INTERVAL
    && value <= DEVICE_INFO_SYNC_MAX_INTERVAL;
}

export async function startScheduler() {
  initializeDatabase();
  const settingsMap = getSettingsMap();
  const enabled = settingsMap.scheduler_enabled === 'true';

  if (!enabled) {
    stopScheduler();
  } else {
    const interval = parseInt(settingsMap.scheduler_interval || '60', 10);
    stopScheduler();

    const cronExpression = interval <= 5 ? '*/5 * * * *' : interval <= 15 ? '*/15 * * * *' : interval <= 30 ? '*/30 * * * *' : '0 * * * *';

    hourlyTask = cron.schedule(
      cronExpression,
      async () => {
        console.log('Running traffic collection...');
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

    console.log(`Scheduler started with interval: ${interval} minutes`);
  }

  await ensureSmsSchedulerStarted();
  await ensureDeviceInfoSchedulerStarted();
}

// This remains the existing flow/alert scheduler stop operation. SMS has its own independent lifecycle.
export function stopScheduler() {
  if (hourlyTask) { hourlyTask.stop(); hourlyTask = null; }
  if (dailyTask) { dailyTask.stop(); dailyTask = null; }
}

export function getSchedulerStatus(): { running: boolean } {
  return { running: hourlyTask !== null };
}

export async function ensureSchedulerStarted() {
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

export async function restartSmsScheduler(): Promise<SmsSyncStatus> {
  initializeDatabase();
  stopSmsScheduler();

  const status = getSmsSyncStatus();
  if (!status.enabled) {
    console.log('SMS sync scheduler is disabled');
    return status;
  }

  smsSyncTask = setInterval(() => {
    void runScheduledSmsSync();
  }, status.interval * 60 * 1000);

  console.log(`SMS sync scheduler started with interval: ${status.interval} minutes`);
  void runScheduledSmsSync();
  return getSmsSyncStatus();
}

function stopSmsScheduler() {
  if (smsSyncTask) {
    clearInterval(smsSyncTask);
    smsSyncTask = null;
  }
}

async function ensureSmsSchedulerStarted() {
  const status = getSmsSyncStatus();
  if (status.enabled && !status.running) {
    await restartSmsScheduler();
  } else if (!status.enabled && status.running) {
    stopSmsScheduler();
  }
}

export async function restartDeviceInfoScheduler(): Promise<DeviceInfoSyncStatus> {
  initializeDatabase();
  stopDeviceInfoScheduler();

  const status = getDeviceInfoSyncStatus();
  if (!status.enabled) {
    console.log('Device info sync scheduler is disabled');
    return status;
  }

  deviceInfoSyncTask = setInterval(() => {
    void runScheduledDeviceInfoSync();
  }, status.interval * 60 * 1000);

  console.log(`Device info sync scheduler started with interval: ${status.interval} minutes`);
  void runScheduledDeviceInfoSync();
  return getDeviceInfoSyncStatus();
}

function stopDeviceInfoScheduler() {
  if (deviceInfoSyncTask) {
    clearInterval(deviceInfoSyncTask);
    deviceInfoSyncTask = null;
  }
}

async function ensureDeviceInfoSchedulerStarted() {
  const status = getDeviceInfoSyncStatus();
  if (status.enabled && !status.running) {
    await restartDeviceInfoScheduler();
  } else if (!status.enabled && status.running) {
    stopDeviceInfoScheduler();
  }
}

async function runScheduledSmsSync() {
  try {
    await syncSmsMessages();
  } catch (error) {
    console.error('Failed to sync SMS messages:', error);
  }
}

async function runScheduledDeviceInfoSync() {
  try {
    await syncDeviceInfo('scheduler');
  } catch (error) {
    console.error('Failed to sync device info:', error);
  }
}

function getDeviceInfoSyncErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '设备信息同步失败';
}

export async function syncDeviceInfo(
  source: 'scheduler' | 'manual' = 'scheduler',
): Promise<DeviceInfoCollectionResult> {
  if (deviceInfoSyncPromise) return deviceInfoSyncPromise;

  const task = performDeviceInfoSync(source);
  deviceInfoSyncPromise = task;
  try {
    return await task;
  } finally {
    if (deviceInfoSyncPromise === task) deviceInfoSyncPromise = null;
  }
}

async function performDeviceInfoSync(
  source: 'scheduler' | 'manual',
): Promise<DeviceInfoCollectionResult> {
  try {
    initializeDatabase();
    const result = await collectDeviceInfo(source);
    if (result.success) {
      updateDeviceInfoSyncMetadata(result.collectedAt || new Date().toISOString(), '');
      console.log(
        `Device info sync completed${result.deviceName ? `: ${result.deviceName}` : ''}`,
      );
    } else {
      updateDeviceInfoSyncMetadata(null, result.error || '设备信息同步失败');
    }
    return result;
  } catch (error) {
    updateDeviceInfoSyncMetadata(null, getDeviceInfoSyncErrorMessage(error));
    throw error;
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '短信同步失败';
}

export async function syncSmsMessages(): Promise<SmsSyncResult> {
  if (smsSyncPromise) return smsSyncPromise;

  const task = performSmsSync();
  smsSyncPromise = task;
  try {
    return await task;
  } finally {
    if (smsSyncPromise === task) smsSyncPromise = null;
  }
}

async function performSmsSync(): Promise<SmsSyncResult> {
  try {
    initializeDatabase();
    const client = getOrCreateCpeClient();
    const { messages } = await client.getSmsMessages();
    const existingCount = (
      db.prepare('SELECT COUNT(*) as count FROM sms_messages').get() as { count?: number } | undefined
    )?.count || 0;
    // Existing persisted messages from an upgrade are already a completed snapshot. A
    // dedicated flag also handles the case where the first successful sync is empty.
    const settings = getSettingsMap();
    const firstSync = settings.sms_initial_sync_completed !== 'true' && existingCount === 0;
    const emailConfig = readNotificationConfig('email');
    const wechatConfig = readNotificationConfig('wechat');
    let inserted = 0;
    let updated = 0;
    let notificationsSent = 0;

    for (const sms of messages) {
      const fingerprint = crypto.createHash('sha256')
        .update(`${sms.id}|${sms.phone}|${sms.date}|${sms.content}`)
        .digest('hex');
      const existing = db.prepare('SELECT fingerprint FROM sms_messages WHERE fingerprint = ?').get(fingerprint);
      if (existing) {
        db.prepare('UPDATE sms_messages SET unread = ?, raw_json = ? WHERE fingerprint = ?')
          .run(sms.unread ? 1 : 0, JSON.stringify(sms), fingerprint);
        updated += 1;
        continue;
      }

      let notified = firstSync ? 1 : 0;
      if (!firstSync && sms.direction === 'inbound') {
        let sent = false;
        if (emailConfig?.to && (Array.isArray(emailConfig.to) ? emailConfig.to.length > 0 : Boolean(emailConfig.to))) {
          sent = await sendSmsNotification(emailConfig, sms) || sent;
        }
        if (wechatConfig?.webhookUrl) {
          sent = await sendSmsWechat(wechatConfig, sms) || sent;
        }
        notified = sent ? 1 : 0;
        if (sent) notificationsSent += 1;
      }

      db.prepare(`
        INSERT INTO sms_messages
          (fingerprint, message_id, phone, content, received_at, unread, direction, notified, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fingerprint,
        sms.id,
        sms.phone,
        sms.content,
        sms.date,
        sms.unread ? 1 : 0,
        sms.direction,
        notified,
        JSON.stringify(sms),
      );
      inserted += 1;
    }

    const syncedAt = new Date().toISOString();
    setSetting('sms_initial_sync_completed', 'true');
    updateSmsSyncMetadata(syncedAt, '');
    console.log(`SMS sync completed: ${messages.length} messages${firstSync ? ' (initial snapshot)' : ''}`);
    return { fetched: messages.length, inserted, updated, notificationsSent, firstSync, syncedAt };
  } catch (error) {
    updateSmsSyncMetadata(null, getErrorMessage(error));
    throw error;
  }
}

async function generateAndSendDailyReport() {
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
  } catch (error) {
    console.error('Failed to generate daily report:', error);
  }
}
