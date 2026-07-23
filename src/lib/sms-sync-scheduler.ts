/**
 * SMS Sync Scheduler — manages periodic SMS message synchronization.
 *
 * Extracted from scheduler.ts to enforce Single Responsibility Principle.
 */
import crypto from 'crypto';
import { db, initializeDatabase } from './db';
import { getOrCreateCpeClient } from './cpe-client';
import { sendSmsNotification } from './notifiers/email';
import { sendSmsWechat } from './notifiers/wechat';
import { getSettingsMap, readNotificationConfig, setSetting } from './settings-store';
import { getErrorMessage } from './error-utils';

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

let smsSyncTask: ReturnType<typeof setInterval> | null = null;
let smsSyncPromise: Promise<SmsSyncResult> | null = null;

function getSmsSyncInterval(value: string | undefined): number {
  const interval = Number(value || 15);
  if (!Number.isInteger(interval)) return 15;
  return Math.min(SMS_SYNC_MAX_INTERVAL, Math.max(SMS_SYNC_MIN_INTERVAL, interval));
}

function updateSmsSyncMetadata(lastSyncedAt: string | null, lastError: string | null): void {
  if (lastSyncedAt !== null) setSetting('sms_last_sync_at', lastSyncedAt);
  if (lastError !== null) setSetting('sms_last_sync_error', lastError);
}

export function getSmsSyncStatus(): SmsSyncStatus {
  initializeDatabase();
  const settings = getSettingsMap();
  return {
    enabled: settings.sms_sync_enabled !== 'false',
    interval: getSmsSyncInterval(settings.sms_sync_interval),
    running: smsSyncTask !== null,
    lastSyncedAt: settings.sms_last_sync_at || null,
    lastError: settings.sms_last_sync_error || null,
  };
}

export function isValidSmsSyncInterval(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= SMS_SYNC_MIN_INTERVAL
    && value <= SMS_SYNC_MAX_INTERVAL;
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

export function stopSmsScheduler(): void {
  if (smsSyncTask) {
    clearInterval(smsSyncTask);
    smsSyncTask = null;
  }
}

export async function ensureSmsSchedulerStarted(): Promise<void> {
  const status = getSmsSyncStatus();
  if (status.enabled && !status.running) {
    await restartSmsScheduler();
  } else if (!status.enabled && status.running) {
    stopSmsScheduler();
  }
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

async function runScheduledSmsSync(): Promise<void> {
  try {
    await syncSmsMessages();
  } catch (error) {
    console.error('Failed to sync SMS messages:', error);
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
    updateSmsSyncMetadata(null, getErrorMessage(error, '短信同步失败'));
    throw error;
  }
}
