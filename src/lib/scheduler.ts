import cron, { ScheduledTask } from 'node-cron';
import crypto from 'crypto';
import { db, initializeDatabase } from './db';
import { getOrCreateCpeClient } from './cpe-client';
import { generateDailyReport } from './report-generator';
import { formatBytes } from './format';
import { sendAlertNotification, sendDailyReport, sendSmsNotification } from './notifiers/email';
import { sendAlertWechat, sendDailyReportWechat, sendSmsWechat } from './notifiers/wechat';
import {
  getSettingsMap,
  readNotificationConfig,
  setSetting,
} from './settings-store';
import type { AlertRuleRow } from './mappers/alert-rule';

export const SMS_SYNC_MIN_INTERVAL = 1;
export const SMS_SYNC_MAX_INTERVAL = 1440;

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

let hourlyTask: ScheduledTask | null = null;
let dailyTask: ScheduledTask | null = null;
let smsSyncTask: ReturnType<typeof setInterval> | null = null;
let smsSyncPromise: Promise<SmsSyncResult> | null = null;

function getSmsSyncInterval(value: string | undefined): number {
  const interval = Number(value || 15);
  if (!Number.isInteger(interval)) return 15;
  return Math.min(SMS_SYNC_MAX_INTERVAL, Math.max(SMS_SYNC_MIN_INTERVAL, interval));
}

function updateSmsSyncMetadata(lastSyncedAt: string | null, lastError: string | null) {
  if (lastSyncedAt !== null) setSetting('sms_last_sync_at', lastSyncedAt);
  if (lastError !== null) setSetting('sms_last_sync_error', lastError);
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

export function isValidSmsSyncInterval(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= SMS_SYNC_MIN_INTERVAL
    && value <= SMS_SYNC_MAX_INTERVAL;
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

    hourlyTask = cron.schedule(cronExpression, async () => {
      console.log('Running traffic collection...');
      await collectTrafficData();
      await checkAlerts();
    });

    dailyTask = cron.schedule('0 22 * * *', async () => {
      console.log('Generating daily report...');
      await generateAndSendDailyReport();
    });

    console.log(`Scheduler started with interval: ${interval} minutes`);
  }

  await ensureSmsSchedulerStarted();
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

async function runScheduledSmsSync() {
  try {
    await syncSmsMessages();
  } catch (error) {
    console.error('Failed to sync SMS messages:', error);
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
    const existingCount = (db.prepare('SELECT COUNT(*) as count FROM sms_messages').get() as any)?.count || 0;
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

async function collectTrafficData() {
  try {
    const cpeConfigResult = db.prepare('SELECT id FROM cpe_config LIMIT 1').get() as { id: number } | undefined;

    if (!cpeConfigResult) {
      console.log('No CPE config found');
      return;
    }

    const client = getOrCreateCpeClient();

    const trafficInfo = await client.getTrafficData();

    db.prepare('INSERT INTO traffic_data (upload_bytes, download_bytes, connected_devices, signal_strength) VALUES (?, ?, ?, ?)')
      .run(trafficInfo.uploadBytes, trafficInfo.downloadBytes, trafficInfo.connectedDevices, trafficInfo.signalStrength);

    for (const device of trafficInfo.devices) {
      db.prepare('INSERT INTO device_data (device_name, device_ip, device_mac, upload_bytes, download_bytes, online_duration) VALUES (?, ?, ?, ?, ?, ?)')
        .run(device.name, device.ip, device.mac, device.uploadBytes, device.downloadBytes, device.onlineDuration);
    }

    console.log(`Collected traffic data: ${trafficInfo.connectedDevices} devices`);
  } catch (error) {
    console.error('Failed to collect traffic data:', error);
  }
}

async function checkAlerts() {
  try {
    const rules = db.prepare('SELECT * FROM alert_rules WHERE enabled = 1').all() as AlertRuleRow[];

    for (const rule of rules) {
      const shouldAlert = await evaluateRule(rule);
      if (shouldAlert) {
        const recentAlert = db.prepare('SELECT * FROM alert_logs WHERE rule_id = ? ORDER BY triggered_at DESC LIMIT 1').get(rule.id) as any;

        if (recentAlert) {
          const lastAlertTime = new Date(recentAlert.triggered_at).getTime();
          const cooldownMs = (rule.cooldown_minutes || 30) * 60 * 1000;
          if (Date.now() - lastAlertTime < cooldownMs) continue;
        }

        const message = `CPE 监控规则“${rule.name}”已触发，当前值 ${rule.operator} 阈值 ${rule.threshold}`;
        const log = db.prepare('INSERT INTO alert_logs (rule_id, message, notified) VALUES (?, ?, ?)').run(rule.id, message, 0);
        let notified = false;

        const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        if (rule.notify_email) {
          const emailConfig = readNotificationConfig('email');
          if (emailConfig) {
            notified = await sendAlertNotification(emailConfig, { ruleName: rule.name, message, timestamp }) || notified;
          }
        }
        if (rule.notify_wechat) {
          const wechatConfig = readNotificationConfig('wechat');
          if (wechatConfig?.webhookUrl) {
            notified = await sendAlertWechat(wechatConfig, { ruleName: rule.name, message, timestamp }) || notified;
          }
        }
        db.prepare('UPDATE alert_logs SET notified = ? WHERE id = ?').run(notified ? 1 : 0, log.lastInsertRowid);
        console.log(`Alert triggered: ${rule.name}`);
      }
    }
  } catch (error) {
    console.error('Failed to check alerts:', error);
  }
}

async function evaluateRule(rule: any): Promise<boolean> {
  const latestTraffic = db.prepare('SELECT * FROM traffic_data ORDER BY timestamp DESC LIMIT 1').get() as any;
  if (!latestTraffic) return false;

  let value = 0;
  switch (rule.metric_type) {
    // Traffic thresholds are entered in MB in the UI; the CPE/database stores bytes.
    case 'traffic_up': value = (latestTraffic.upload_bytes || 0) / 1024 / 1024; break;
    case 'traffic_down': value = (latestTraffic.download_bytes || 0) / 1024 / 1024; break;
    case 'devices': value = latestTraffic.connected_devices || 0; break;
    case 'signal': value = latestTraffic.signal_strength || 0; break;
    default: return false;
  }

  switch (rule.operator) {
    case '>': return value > rule.threshold;
    case '<': return value < rule.threshold;
    case '>=': return value >= rule.threshold;
    case '<=': return value <= rule.threshold;
    default: return false;
  }
}

async function generateAndSendDailyReport() {
  try {
    const report = await generateDailyReport();

    db.prepare('INSERT INTO daily_reports (report_date, total_upload, total_download, peak_hour, top_devices, avg_signal, uptime_percent, network_quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(report.reportDate, report.totalUpload, report.totalDownload, report.peakHour, JSON.stringify(report.topDevices || []), report.avgSignal, report.uptimePercent, report.networkQuality);

    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
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
        networkQuality: report.networkQuality,
        avgSignal: report.avgSignal,
      }) || sent;
    }
    if (sent) db.prepare('UPDATE daily_reports SET sent_at = ? WHERE report_date = ?').run(timestamp, report.reportDate);

    console.log('Daily report generated and stored');
  } catch (error) {
    console.error('Failed to generate daily report:', error);
  }
}
