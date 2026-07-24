import type { EmailConfig, WechatConfig } from '@/types';
import type { TelegramConfig } from '@/lib/notifiers/telegram';
import type { DingtalkConfig } from '@/lib/notifiers/dingtalk';
import type { BarkConfig } from '@/lib/notifiers/bark';
import {
  decryptSecureValue,
  encryptSecureValue,
  isEncryptedSecureValue,
} from '@/lib/secure-value';
import {
  notificationConfigNeedsMigration,
  prepareNotificationConfigForStorage,
  readNotificationConfigForDelivery,
  toPublicNotificationConfig,
  type NotificationType,
} from '@/lib/notification-config';
import {
  findCpeConfig,
  findNotificationConfig,
  insertCpeConfig,
  listNotificationConfigs,
  listSystemSettings,
  saveNotificationConfig,
  updateCpeConfig,
  updateCpePassword,
  upsertSystemSetting,
  type CpeConfigRow,
  type NotificationConfigRow,
  type SystemSettingRow,
} from '@/lib/repositories/settings-repository';

export type { CpeConfigRow, NotificationConfigRow, SystemSettingRow };

export interface PublicCpeConfig {
  cpe_url: string;
  cpe_username: string;
  cpe_password_set: boolean;
  password_source: 'env' | 'database' | 'unset';
  id?: number;
  updated_at?: string | null;
}

export interface PublicNotificationConfigRow extends NotificationConfigRow {
  config: string;
}

export const DEFAULT_CPE_URL = process.env.CPE_DEFAULT_URL || 'http://192.168.31.1';
export const DEFAULT_CPE_USERNAME = process.env.CPE_USERNAME || 'admin';
const CPE_PASSWORD_PURPOSE = 'cpe-config-password';

export function getSettingsMap(): Record<string, string> {
  return Object.fromEntries(
    listSystemSettings().map((setting) => [setting.key, setting.value]),
  );
}

export function getSetting(key: string, fallback = ''): string {
  return getSettingsMap()[key] ?? fallback;
}

export function setSetting(key: string, value: string): void {
  upsertSystemSetting(key, value);
}

export function getCpeConfigRow(): CpeConfigRow | null {
  return findCpeConfig();
}

/** Safe check — returns true if CPE password is set via either DB or env var. */
export function isCpeConfigured(): boolean {
  return Boolean(process.env.CPE_PASSWORD || getCpeConfigRow()?.cpe_password_encrypted);
}

export function getCpeConfigStatus(): {
  configured: boolean;
  source: 'env' | 'database' | 'unset';
  url: string;
  username: string;
} {
  const config = getCpeConfigRow();
  const hasEnvPassword = Boolean(process.env.CPE_PASSWORD);
  const hasDbPassword = Boolean(config?.cpe_password_encrypted);
  return {
    configured: hasEnvPassword || hasDbPassword,
    source: hasEnvPassword ? 'env' : hasDbPassword ? 'database' : 'unset',
    url: config?.cpe_url || DEFAULT_CPE_URL,
    username: config?.cpe_username || DEFAULT_CPE_USERNAME,
  };
}

export function getPublicCpeConfig(): PublicCpeConfig {
  const config = getCpeConfigRow();
  if (!config) {
    return {
      cpe_url: DEFAULT_CPE_URL,
      cpe_username: DEFAULT_CPE_USERNAME,
      cpe_password_set: Boolean(process.env.CPE_PASSWORD),
      password_source: process.env.CPE_PASSWORD ? 'env' : 'unset',
    };
  }

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

/** Returns decrypted credentials for server-side CPE calls only. */
export function getCpeCredentials(): { url: string; username: string; password: string } {
  const config = getCpeConfigRow();
  const environmentPassword = process.env.CPE_PASSWORD || '';
  let storedPassword = config?.cpe_password_encrypted || '';

  if (environmentPassword && config && storedPassword && !isEncryptedSecureValue(storedPassword)) {
    updateCpePassword(config.id, null);
    storedPassword = '';
  } else if (config && storedPassword && !isEncryptedSecureValue(storedPassword)) {
    storedPassword = encryptSecureValue(storedPassword, CPE_PASSWORD_PURPOSE);
    updateCpePassword(config.id, storedPassword);
  }

  const password = environmentPassword || (
    storedPassword ? decryptSecureValue(storedPassword, CPE_PASSWORD_PURPOSE) : ''
  );
  if (!password) throw new Error('CPE not configured');

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
}): void {
  const existing = getCpeConfigRow();
  const password = typeof input.cpePassword === 'string' && input.cpePassword.trim()
    ? input.cpePassword.trim()
    : null;
  const encryptedPassword = password
    ? encryptSecureValue(password, CPE_PASSWORD_PURPOSE)
    : null;

  if (existing) {
    if (encryptedPassword) {
      updateCpeConfig({
        id: existing.id,
        cpeUrl: input.cpeUrl,
        cpeUsername: input.cpeUsername,
        encryptedPassword,
      });
      return;
    }

    if (existing.cpe_password_encrypted && !isEncryptedSecureValue(existing.cpe_password_encrypted)) {
      updateCpeConfig({
        id: existing.id,
        cpeUrl: input.cpeUrl,
        cpeUsername: input.cpeUsername,
        encryptedPassword: encryptSecureValue(
          existing.cpe_password_encrypted,
          CPE_PASSWORD_PURPOSE,
        ),
      });
      return;
    }

    updateCpeConfig({
      id: existing.id,
      cpeUrl: input.cpeUrl,
      cpeUsername: input.cpeUsername,
    });
    return;
  }

  if (!password && !process.env.CPE_PASSWORD) {
    throw new Error('请先设置 CPE_PASSWORD 或输入 CPE 密码');
  }

  insertCpeConfig({
    cpeUrl: input.cpeUrl,
    cpeUsername: input.cpeUsername,
    encryptedPassword,
  });
}

/** Returns notification rows with all secrets removed from their public JSON. */
export function listNotificationConfigRows(): PublicNotificationConfigRow[] {
  return listNotificationConfigs().map((row) => {
    if (row.type !== 'email' && row.type !== 'wechat') {
      return { ...row, config: '{}' };
    }
    return {
      ...row,
      config: JSON.stringify(toPublicNotificationConfig(row.type, row.config)),
    };
  });
}

export function getNotificationConfigRow(type: NotificationType): NotificationConfigRow | null {
  return findNotificationConfig(type);
}

export function readNotificationConfig(type: 'email'): EmailConfig | null;
export function readNotificationConfig(type: 'wechat'): WechatConfig | null;
export function readNotificationConfig(type: 'telegram'): TelegramConfig | null;
export function readNotificationConfig(type: 'dingtalk'): DingtalkConfig | null;
export function readNotificationConfig(type: 'bark'): BarkConfig | null;
export function readNotificationConfig(type: NotificationType): EmailConfig | WechatConfig | TelegramConfig | DingtalkConfig | BarkConfig | null {
  const row = getNotificationConfigRow(type);
  if (!row || !row.enabled) return null;

  try {
    const config = readNotificationConfigForDelivery(type, row.config);
    if (notificationConfigNeedsMigration(type, row.config)) {
      saveNotificationConfig({
        type,
        config: prepareNotificationConfigForStorage(type, config),
        enabled: Boolean(row.enabled),
      });
    }
    return config;
  } catch (error) {
    console.error(`Failed to read notification config for ${type}`, error);
    return null;
  }
}

export function upsertNotificationConfig(input: {
  type: NotificationType;
  config: unknown;
  enabled?: boolean;
}): void {
  const existing = getNotificationConfigRow(input.type);
  const serializedConfig = prepareNotificationConfigForStorage(
    input.type,
    input.config,
    existing?.config,
  );
  saveNotificationConfig({
    type: input.type,
    config: serializedConfig,
    enabled: input.enabled ?? true,
  });
}
