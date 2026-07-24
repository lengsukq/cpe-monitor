import type { EmailConfig, WechatConfig } from '../types/index.ts';
import type { TelegramConfig } from './notifiers/telegram.ts';
import type { DingtalkConfig } from './notifiers/dingtalk.ts';
import type { BarkConfig } from './notifiers/bark.ts';
import {
  decryptSecureValue,
  encryptSecureValue,
  isEncryptedSecureValue,
} from './secure-value.ts';

export type NotificationType = 'email' | 'wechat' | 'telegram' | 'dingtalk' | 'bark';

const EMAIL_PASSWORD_PURPOSE = 'notification-email-smtp-password';
const WECHAT_WEBHOOK_PURPOSE = 'notification-wechat-webhook';
const TELEGRAM_TOKEN_PURPOSE = 'notification-telegram-bot-token';
const DINGTALK_WEBHOOK_PURPOSE = 'notification-dingtalk-webhook';
const DINGTALK_SECRET_PURPOSE = 'notification-dingtalk-secret';
const BARK_KEY_PURPOSE = 'notification-bark-device-key';

interface StoredEmailConfig extends Omit<EmailConfig, 'smtpPass'> {
  smtpPass: string;
}

interface StoredWechatConfig {
  webhookUrl: string;
}

interface StoredTelegramConfig {
  botToken: string;
  chatId: string;
}

interface StoredDingtalkConfig {
  webhookUrl: string;
  secret: string;
}

interface StoredBarkConfig {
  serverUrl: string;
  deviceKey: string;
}

export interface PublicEmailConfig extends Omit<EmailConfig, 'smtpPass'> {
  smtpPass: '';
  smtpPasswordSet: boolean;
}

export interface PublicWechatConfig {
  webhookUrl: '';
  webhookConfigured: boolean;
}

export interface PublicTelegramConfig {
  botToken: '';
  chatId: string;
  botTokenSet: boolean;
}

export interface PublicDingtalkConfig {
  webhookUrl: '';
  webhookConfigured: boolean;
  secretConfigured: boolean;
}

export interface PublicBarkConfig {
  serverUrl: string;
  deviceKey: '';
  deviceKeySet: boolean;
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

export function readTelegramConfig(raw: unknown): TelegramConfig {
  const config = asObject(raw);
  return {
    botToken: readSecret(config.botToken, TELEGRAM_TOKEN_PURPOSE),
    chatId: stringValue(config.chatId),
  };
}

export function readDingtalkConfig(raw: unknown): DingtalkConfig {
  const config = asObject(raw);
  return {
    webhookUrl: readSecret(config.webhookUrl, DINGTALK_WEBHOOK_PURPOSE),
    secret: readSecret(config.secret, DINGTALK_SECRET_PURPOSE) || undefined,
  };
}

export function readBarkConfig(raw: unknown): BarkConfig {
  const config = asObject(raw);
  return {
    serverUrl: stringValue(config.serverUrl) || 'https://api.day.app',
    deviceKey: readSecret(config.deviceKey, BARK_KEY_PURPOSE),
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

export function prepareTelegramConfigForStorage(
  input: unknown,
  existingRaw?: unknown,
): StoredTelegramConfig {
  const next = asObject(input);
  const existing = existingRaw === undefined ? null : readTelegramConfig(existingRaw);
  const submittedToken = stringValue(next.botToken);
  const botToken = submittedToken || existing?.botToken || '';
  return {
    botToken: storeSecret(botToken, TELEGRAM_TOKEN_PURPOSE),
    chatId: stringValue(next.chatId) || existing?.chatId || '',
  };
}

export function prepareDingtalkConfigForStorage(
  input: unknown,
  existingRaw?: unknown,
): StoredDingtalkConfig {
  const next = asObject(input);
  const existing = existingRaw === undefined ? null : readDingtalkConfig(existingRaw);
  const submittedWebhook = stringValue(next.webhookUrl);
  const webhookUrl = submittedWebhook || existing?.webhookUrl || '';
  const submittedSecret = stringValue(next.secret);
  const secret = submittedSecret || existing?.secret || '';
  return {
    webhookUrl: storeSecret(webhookUrl, DINGTALK_WEBHOOK_PURPOSE),
    secret: storeSecret(secret, DINGTALK_SECRET_PURPOSE),
  };
}

export function prepareBarkConfigForStorage(
  input: unknown,
  existingRaw?: unknown,
): StoredBarkConfig {
  const next = asObject(input);
  const existing = existingRaw === undefined ? null : readBarkConfig(existingRaw);
  const submittedKey = stringValue(next.deviceKey);
  const deviceKey = submittedKey || existing?.deviceKey || '';
  return {
    serverUrl: stringValue(next.serverUrl) || existing?.serverUrl || 'https://api.day.app',
    deviceKey: storeSecret(deviceKey, BARK_KEY_PURPOSE),
  };
}

export function prepareNotificationConfigForStorage(
  type: NotificationType,
  input: unknown,
  existingRaw?: unknown,
): string {
  let stored: unknown;
  switch (type) {
    case 'email':
      stored = prepareEmailConfigForStorage(input, existingRaw);
      break;
    case 'wechat':
      stored = prepareWechatConfigForStorage(input, existingRaw);
      break;
    case 'telegram':
      stored = prepareTelegramConfigForStorage(input, existingRaw);
      break;
    case 'dingtalk':
      stored = prepareDingtalkConfigForStorage(input, existingRaw);
      break;
    case 'bark':
      stored = prepareBarkConfigForStorage(input, existingRaw);
      break;
    default:
      stored = {};
  }
  return JSON.stringify(stored);
}

export function notificationConfigNeedsMigration(
  type: NotificationType,
  raw: unknown,
): boolean {
  const config = asObject(raw);
  let secret = '';
  switch (type) {
    case 'email':
      secret = stringValue(config.smtpPass);
      break;
    case 'wechat':
      secret = stringValue(config.webhookUrl);
      break;
    case 'telegram':
      secret = stringValue(config.botToken);
      break;
    case 'dingtalk':
      secret = stringValue(config.webhookUrl);
      break;
    case 'bark':
      secret = stringValue(config.deviceKey);
      break;
  }
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
  type: 'telegram',
  raw: unknown,
): TelegramConfig;
export function readNotificationConfigForDelivery(
  type: 'dingtalk',
  raw: unknown,
): DingtalkConfig;
export function readNotificationConfigForDelivery(
  type: 'bark',
  raw: unknown,
): BarkConfig;
export function readNotificationConfigForDelivery(
  type: NotificationType,
  raw: unknown,
): EmailConfig | WechatConfig | TelegramConfig | DingtalkConfig | BarkConfig;
export function readNotificationConfigForDelivery(
  type: NotificationType,
  raw: unknown,
): EmailConfig | WechatConfig | TelegramConfig | DingtalkConfig | BarkConfig {
  switch (type) {
    case 'email': return readEmailConfig(raw);
    case 'wechat': return readWechatConfig(raw);
    case 'telegram': return readTelegramConfig(raw);
    case 'dingtalk': return readDingtalkConfig(raw);
    case 'bark': return readBarkConfig(raw);
    default: return readEmailConfig(raw);
  }
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

export function toPublicTelegramConfig(raw: unknown): PublicTelegramConfig {
  const config = readTelegramConfig(raw);
  return {
    botToken: '',
    chatId: config.chatId,
    botTokenSet: Boolean(config.botToken),
  };
}

export function toPublicDingtalkConfig(raw: unknown): PublicDingtalkConfig {
  const config = readDingtalkConfig(raw);
  return {
    webhookUrl: '',
    webhookConfigured: Boolean(config.webhookUrl),
    secretConfigured: Boolean(config.secret),
  };
}

export function toPublicBarkConfig(raw: unknown): PublicBarkConfig {
  const config = readBarkConfig(raw);
  return {
    serverUrl: config.serverUrl,
    deviceKey: '',
    deviceKeySet: Boolean(config.deviceKey),
  };
}

export function toPublicNotificationConfig(
  type: NotificationType,
  raw: unknown,
): PublicEmailConfig | PublicWechatConfig | PublicTelegramConfig | PublicDingtalkConfig | PublicBarkConfig {
  switch (type) {
    case 'email': return toPublicEmailConfig(raw);
    case 'wechat': return toPublicWechatConfig(raw);
    case 'telegram': return toPublicTelegramConfig(raw);
    case 'dingtalk': return toPublicDingtalkConfig(raw);
    case 'bark': return toPublicBarkConfig(raw);
    default: return toPublicEmailConfig(raw);
  }
}
