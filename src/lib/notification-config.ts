import type { EmailConfig, WechatConfig } from '../types/index.ts';
import {
  decryptSecureValue,
  encryptSecureValue,
  isEncryptedSecureValue,
} from './secure-value.ts';

export type NotificationType = 'email' | 'wechat';

const EMAIL_PASSWORD_PURPOSE = 'notification-email-smtp-password';
const WECHAT_WEBHOOK_PURPOSE = 'notification-wechat-webhook';

interface StoredEmailConfig extends Omit<EmailConfig, 'smtpPass'> {
  smtpPass: string;
}

interface StoredWechatConfig {
  webhookUrl: string;
}

export interface PublicEmailConfig extends Omit<EmailConfig, 'smtpPass'> {
  smtpPass: '';
  smtpPasswordSet: boolean;
}

export interface PublicWechatConfig {
  webhookUrl: '';
  webhookConfigured: boolean;
}

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePort(value: unknown): number {
  const parsed = Number(value || 587);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : 587;
}

function normalizeRecipients(value: unknown): string[] {
  const candidates = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\n,;]+/)
      : [];
  return [...new Set(
    candidates
      .map((recipient) => stringValue(recipient))
      .filter(Boolean),
  )];
}

function readSecret(value: unknown, purpose: string): string {
  const raw = stringValue(value);
  if (!raw) return '';
  return isEncryptedSecureValue(raw)
    ? decryptSecureValue(raw, purpose)
    : raw;
}

function storeSecret(value: string, purpose: string): string {
  return value ? encryptSecureValue(value, purpose) : '';
}

export function readEmailConfig(raw: unknown): EmailConfig {
  const config = asObject(raw);
  return {
    smtpHost: stringValue(config.smtpHost),
    smtpPort: normalizePort(config.smtpPort),
    smtpUser: stringValue(config.smtpUser),
    smtpPass: readSecret(config.smtpPass, EMAIL_PASSWORD_PURPOSE),
    from: stringValue(config.from),
    to: normalizeRecipients(config.to),
  };
}

export function readWechatConfig(raw: unknown): WechatConfig {
  const config = asObject(raw);
  return {
    webhookUrl: readSecret(config.webhookUrl, WECHAT_WEBHOOK_PURPOSE),
  };
}

export function prepareEmailConfigForStorage(
  input: unknown,
  existingRaw?: unknown,
): StoredEmailConfig {
  const next = asObject(input);
  const existing = existingRaw === undefined ? null : readEmailConfig(existingRaw);
  const submittedPassword = stringValue(next.smtpPass);
  const smtpPass = submittedPassword || existing?.smtpPass || '';

  return {
    smtpHost: stringValue(next.smtpHost),
    smtpPort: normalizePort(next.smtpPort),
    smtpUser: stringValue(next.smtpUser),
    smtpPass: storeSecret(smtpPass, EMAIL_PASSWORD_PURPOSE),
    from: stringValue(next.from),
    to: normalizeRecipients(next.to),
  };
}

export function prepareWechatConfigForStorage(
  input: unknown,
  existingRaw?: unknown,
): StoredWechatConfig {
  const next = asObject(input);
  const existing = existingRaw === undefined ? null : readWechatConfig(existingRaw);
  const submittedWebhook = stringValue(next.webhookUrl);
  const webhookUrl = submittedWebhook || existing?.webhookUrl || '';
  return {
    webhookUrl: storeSecret(webhookUrl, WECHAT_WEBHOOK_PURPOSE),
  };
}

export function prepareNotificationConfigForStorage(
  type: NotificationType,
  input: unknown,
  existingRaw?: unknown,
): string {
  const stored = type === 'email'
    ? prepareEmailConfigForStorage(input, existingRaw)
    : prepareWechatConfigForStorage(input, existingRaw);
  return JSON.stringify(stored);
}

export function notificationConfigNeedsMigration(
  type: NotificationType,
  raw: unknown,
): boolean {
  const config = asObject(raw);
  const secret = type === 'email'
    ? stringValue(config.smtpPass)
    : stringValue(config.webhookUrl);
  return Boolean(secret) && !isEncryptedSecureValue(secret);
}

export function readNotificationConfigForDelivery(
  type: 'email',
  raw: unknown,
): EmailConfig;
export function readNotificationConfigForDelivery(
  type: 'wechat',
  raw: unknown,
): WechatConfig;
export function readNotificationConfigForDelivery(
  type: NotificationType,
  raw: unknown,
): EmailConfig | WechatConfig {
  return type === 'email' ? readEmailConfig(raw) : readWechatConfig(raw);
}

export function toPublicEmailConfig(raw: unknown): PublicEmailConfig {
  const config = readEmailConfig(raw);
  return {
    ...config,
    smtpPass: '',
    smtpPasswordSet: Boolean(config.smtpPass),
  };
}

export function toPublicWechatConfig(raw: unknown): PublicWechatConfig {
  const config = readWechatConfig(raw);
  return {
    webhookUrl: '',
    webhookConfigured: Boolean(config.webhookUrl),
  };
}

export function toPublicNotificationConfig(
  type: NotificationType,
  raw: unknown,
): PublicEmailConfig | PublicWechatConfig {
  return type === 'email' ? toPublicEmailConfig(raw) : toPublicWechatConfig(raw);
}
