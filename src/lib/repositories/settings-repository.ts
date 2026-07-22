import { db, ensureDatabaseReady } from '@/lib/db';

export interface SystemSettingRow {
  key: string;
  value: string;
}

export interface CpeConfigRow {
  id: number;
  cpe_url: string;
  cpe_username: string | null;
  cpe_password_encrypted: string | null;
  updated_at: string | null;
}

export interface NotificationConfigRow {
  id: number;
  type: 'email' | 'wechat' | string;
  config: string;
  enabled: number | null;
  updated_at: string | null;
}

export function listSystemSettings(): SystemSettingRow[] {
  ensureDatabaseReady();
  return db.prepare('SELECT key, value FROM system_settings').all() as SystemSettingRow[];
}

export function upsertSystemSetting(key: string, value: string): void {
  ensureDatabaseReady();
  db.prepare(
    `INSERT INTO system_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, value);
}

export function findCpeConfig(): CpeConfigRow | null {
  ensureDatabaseReady();
  return (
    db.prepare('SELECT * FROM cpe_config ORDER BY id ASC LIMIT 1').get() as CpeConfigRow | undefined
  ) || null;
}

export function updateCpeConfig(input: {
  id: number;
  cpeUrl: string;
  cpeUsername: string;
  encryptedPassword?: string;
}): void {
  ensureDatabaseReady();
  if (input.encryptedPassword !== undefined) {
    db.prepare(
      `UPDATE cpe_config
       SET cpe_url = ?, cpe_username = ?, cpe_password_encrypted = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(input.cpeUrl, input.cpeUsername, input.encryptedPassword || null, input.id);
    return;
  }

  db.prepare(
    `UPDATE cpe_config
     SET cpe_url = ?, cpe_username = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(input.cpeUrl, input.cpeUsername, input.id);
}

export function updateCpePassword(id: number, encryptedPassword: string | null): void {
  ensureDatabaseReady();
  db.prepare(
    `UPDATE cpe_config
     SET cpe_password_encrypted = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(encryptedPassword, id);
}

export function insertCpeConfig(input: {
  cpeUrl: string;
  cpeUsername: string;
  encryptedPassword: string | null;
}): void {
  ensureDatabaseReady();
  db.prepare(
    `INSERT INTO cpe_config (cpe_url, cpe_username, cpe_password_encrypted)
     VALUES (?, ?, ?)`,
  ).run(input.cpeUrl, input.cpeUsername, input.encryptedPassword);
}

export function listNotificationConfigs(): NotificationConfigRow[] {
  ensureDatabaseReady();
  return db.prepare(
    'SELECT id, type, config, enabled, updated_at FROM notification_config ORDER BY id ASC',
  ).all() as NotificationConfigRow[];
}

export function findNotificationConfig(type: 'email' | 'wechat'): NotificationConfigRow | null {
  ensureDatabaseReady();
  return (
    db.prepare(
      `SELECT id, type, config, enabled, updated_at
       FROM notification_config
       WHERE type = ?
       ORDER BY id ASC
       LIMIT 1`,
    ).get(type) as NotificationConfigRow | undefined
  ) || null;
}

export function saveNotificationConfig(input: {
  type: 'email' | 'wechat';
  config: string;
  enabled: boolean;
}): void {
  ensureDatabaseReady();
  const existing = findNotificationConfig(input.type);
  if (existing) {
    db.prepare(
      `UPDATE notification_config
       SET config = ?, enabled = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(input.config, input.enabled ? 1 : 0, existing.id);
    return;
  }

  db.prepare(
    `INSERT INTO notification_config (type, config, enabled)
     VALUES (?, ?, ?)`,
  ).run(input.type, input.config, input.enabled ? 1 : 0);
}
