/**
 * SMS Sync Scheduler — manages periodic SMS message synchronization.
 *
 * Uses the generic IntervalScheduler factory for scheduling lifecycle;
 * this module only contains SMS-specific business logic.
 */
import crypto from 'crypto';
import { db, initializeDatabase } from './db';
import { getOrCreateCpeClient } from './cpe-client';
import { sendSmsNotification } from './notifiers/email';
import { sendSmsWechat } from './notifiers/wechat';
import { getSettingsMap, readNotificationConfig, setSetting } from './settings-store';
import { createIntervalScheduler, type SyncStatus } from './interval-scheduler';

export const SMS_SYNC_MIN_INTERVAL = 1;
export const SMS_SYNC_MAX_INTERVAL = 1440;
export const SMS_SYNC_DEFAULT_INTERVAL = 15;

export type SmsSyncStatus = SyncStatus;

export interface SmsSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  notificationsSent: number;
  firstSync: boolean;
  syncedAt: string;
}

const scheduler = createIntervalScheduler({
  name: 'SMS sync',
  settingPrefix: 'sms',
  defaultInterval: SMS_SYNC_DEFAULT_INTERVAL,
  minInterval: SMS_SYNC_MIN_INTERVAL,
  maxInterval: SMS_SYNC_MAX_INTERVAL,
  task: () => performSmsSync(),
});

export function getSmsSyncStatus(): SmsSyncStatus {
  return scheduler.getStatus();
}

export function isValidSmsSyncInterval(value: unknown): value is number {
  return scheduler.isValidInterval(value);
}

export async function restartSmsScheduler(): Promise<SmsSyncStatus> {
  return scheduler.restart();
}

export function stopSmsScheduler(): void {
  scheduler.stop();
}

export async function ensureSmsSchedulerStarted(): Promise<void> {
  return scheduler.ensureStarted();
}

export async function syncSmsMessages(): Promise<SmsSyncResult> {
  return scheduler.sync() as Promise<SmsSyncResult>;
}

// ─── Business Logic ────────────────────────────────────────────────────────

async function performSmsSync(): Promise<SmsSyncResult> {
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
  console.log(`SMS sync completed: ${messages.length} messages${firstSync ? ' (initial snapshot)' : ''}`);
  return { fetched: messages.length, inserted, updated, notificationsSent, firstSync, syncedAt };
}
