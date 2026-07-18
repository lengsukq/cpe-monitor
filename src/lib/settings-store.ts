import { db, ensureDatabaseReady } from '@/lib/db';
import type { EmailConfig, WechatConfig } from '@/types';

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

export interface PublicCpeConfig {
  cpe_url: string;
  cpe_username: string;
  cpe_password_set: boolean;
  password_source: 'env' | 'database' | 'unset';
  id?: number;
  updated_at?: string | null;
}

export const DEFAULT_CPE_URL = process.env.CPE_DEFAULT_URL || 'http://192.168.31.1';
export const DEFAULT_CPE_USERNAME = process.env.CPE_USERNAME || 'admin';

export function getSettingsMap(): Record<string, string> {
  ensureDatabaseReady();
  const settings = db.prepare('SELECT key, value FROM system_settings').all() as SystemSettingRow[];
  return Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
}

export function getSetting(key: string, fallback = ''): string {
  const settingsMap = getSettingsMap();
  return settingsMap[key] ?? fallback;
}

export function setSetting(key: string, value: string) {
  ensureDatabaseReady();
  db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getCpeConfigRow(): CpeConfigRow | null {
  ensureDatabaseReady();
  return (db.prepare('SELECT * FROM cpe_config LIMIT 1').get() as CpeConfigRow | undefined) || null;
}

export function getPublicCpeConfig(): PublicCpeConfig {
  const config = getCpeConfigRow();
  if (config) {
    return {
      id: config.id,
      cpe_url: config.cpe_url,
      cpe_username: config.cpe_username || DEFAULT_CPE_USERNAME,
      updated_at: config.updated_at,
      cpe_password_set: Boolean(process.env.CPE_PASSWORD || config.cpe_password_encrypted),
      password_source: process.env.CPE_PASSWORD
        ? 'env'
        : config.cpe_password_encrypted
          ? 'database'
          : 'unset',
    };
  }

  return {
    cpe_url: DEFAULT_CPE_URL,
    cpe_username: DEFAULT_CPE_USERNAME,
    cpe_password_set: Boolean(process.env.CPE_PASSWORD),
    password_source: process.env.CPE_PASSWORD ? 'env' : 'unset',
  };
}

export function getCpeCredentials(): { url: string; username: string; password: string } {
  const config = getCpeConfigRow();
  const password = process.env.CPE_PASSWORD || config?.cpe_password_encrypted || '';
  if (!password) {
    throw new Error('CPE not configured');
  }

  return {
    url: config?.cpe_url || DEFAULT_CPE_URL,
    username: config?.cpe_username || DEFAULT_CPE_USERNAME,
    password,
  };
}

export function upsertCpeConfig(input: {
  cpeUrl: string;
  cpeUsername: string;
  cpePassword?: string | null;
}) {
  ensureDatabaseReady();
  const existing = getCpeConfigRow();
  const password = typeof input.cpePassword === 'string' && input.cpePassword.trim()
    ? input.cpePassword.trim()
    : null;

  if (existing) {
    if (password) {
      db.prepare(
        'UPDATE cpe_config SET cpe_url = ?, cpe_username = ?, cpe_password_encrypted = ?, updated_at = datetime("now") WHERE id = ?',
      ).run(input.cpeUrl, input.cpeUsername, password, existing.id);
    } else {
      db.prepare(
        'UPDATE cpe_config SET cpe_url = ?, cpe_username = ?, updated_at = datetime("now") WHERE id = ?',
      ).run(input.cpeUrl, input.cpeUsername, existing.id);
    }
    return;
  }

  if (!password && !process.env.CPE_PASSWORD) {
    throw new Error('请先设置 CPE_PASSWORD 或输入 CPE 密码');
  }

  db.prepare(
    'INSERT INTO cpe_config (cpe_url, cpe_username, cpe_password_encrypted) VALUES (?, ?, ?)',
  ).run(input.cpeUrl, input.cpeUsername, password);
}

export function listNotificationConfigRows(): NotificationConfigRow[] {
  ensureDatabaseReady();
  return db.prepare('SELECT * FROM notification_config').all() as NotificationConfigRow[];
}

export function getNotificationConfigRow(type: 'email' | 'wechat'): NotificationConfigRow | null {
  ensureDatabaseReady();
  return (
    (db
      .prepare('SELECT * FROM notification_config WHERE type = ? LIMIT 1')
      .get(type) as NotificationConfigRow | undefined) || null
  );
}

export function readNotificationConfig(type: 'email'): EmailConfig | null;
export function readNotificationConfig(type: 'wechat'): WechatConfig | null;
export function readNotificationConfig(type: 'email' | 'wechat'): EmailConfig | WechatConfig | null {
  const row = getNotificationConfigRow(type);
  if (!row || !row.enabled) return null;
  try {
    return JSON.parse(row.config) as EmailConfig | WechatConfig;
  } catch (error) {
    console.error(`Failed to parse notification config for ${type}`, error);
    return null;
  }
}

export function upsertNotificationConfig(input: {
  type: 'email' | 'wechat';
  config: unknown;
  enabled?: boolean;
}) {
  ensureDatabaseReady();
  const serializedConfig = typeof input.config === 'string'
    ? input.config
    : JSON.stringify(input.config);
  const enabledValue = input.enabled === undefined ? 1 : input.enabled ? 1 : 0;
  const existing = getNotificationConfigRow(input.type);

  if (existing) {
    db.prepare(
      'UPDATE notification_config SET config = ?, enabled = ?, updated_at = datetime("now") WHERE id = ?',
    ).run(serializedConfig, enabledValue, existing.id);
    return;
  }

  db.prepare(
    'INSERT INTO notification_config (type, config, enabled) VALUES (?, ?, ?)',
  ).run(input.type, serializedConfig, enabledValue);
}
