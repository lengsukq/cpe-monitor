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

function tryReadSecret(value: unknown, purpose: string): string {
  try {
    return readSecret(value, purpose);
  } catch {
    return '';
  }
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
  const existingObj = existingRaw === undefined ? null : asObject(existingRaw);
  const submittedPassword = stringValue(next.smtpPass);
  const existingPass = existingObj ? tryReadSecret(existingObj.smtpPass, EMAIL_PASSWORD_PURPOSE) : '';
  const smtpPass = submittedPassword || existingPass || '';

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
  const existingObj = existingRaw === undefined ? null : asObject(existingRaw);
  const submittedWebhook = stringValue(next.webhookUrl);
  const existingWebhook = existingObj ? tryReadSecret(existingObj.webhookUrl, WECHAT_WEBHOOK_PURPOSE) : '';
  const webhookUrl = submittedWebhook || existingWebhook || '';
  return {
    webhookUrl: storeSecret(webhookUrl, WECHAT_WEBHOOK_PURPOSE),
  };
}

export function prepareTelegramConfigForStorage(
  input: unknown,
  existingRaw?: unknown,
): StoredTelegramConfig {
  const next = asObject(input);
  const existingObj = existingRaw === undefined ? null : asObject(existingRaw);
  const submittedToken = stringValue(next.botToken);
  const existingToken = existingObj ? tryReadSecret(existingObj.botToken, TELEGRAM_TOKEN_PURPOSE) : '';
  const botToken = submittedToken || existingToken || '';
  return {
    botToken: storeSecret(botToken, TELEGRAM_TOKEN_PURPOSE),
    chatId: stringValue(next.chatId) || stringValue(existingObj?.chatId) || '',
  };
}

export function prepareDingtalkConfigForStorage(
  input: unknown,
  existingRaw?: unknown,
): StoredDingtalkConfig {
  const next = asObject(input);
  const existingObj = existingRaw === undefined ? null : asObject(existingRaw);
  const submittedWebhook = stringValue(next.webhookUrl);
  const existingWebhook = existingObj ? tryReadSecret(existingObj.webhookUrl, DINGTALK_WEBHOOK_PURPOSE) : '';
  const webhookUrl = submittedWebhook || existingWebhook || '';
  const submittedSecret = stringValue(next.secret);
  const existingSecret = existingObj ? tryReadSecret(existingObj.secret, DINGTALK_SECRET_PURPOSE) : '';
  const secret = submittedSecret || existingSecret || '';
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
  const existingObj = existingRaw === undefined ? null : asObject(existingRaw);
  const submittedKey = stringValue(next.deviceKey);
  const existingKey = existingObj ? tryReadSecret(existingObj.deviceKey, BARK_KEY_PURPOSE) : '';
  const deviceKey = submittedKey || existingKey || '';
  return {
    serverUrl: stringValue(next.serverUrl) || stringValue(existingObj?.serverUrl) || 'https://api.day.app',
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
  const obj = asObject(raw);
  const secret = tryReadSecret(obj.smtpPass, EMAIL_PASSWORD_PURPOSE);
  return {
    smtpHost: stringValue(obj.smtpHost),
    smtpPort: normalizePort(obj.smtpPort),
    smtpUser: stringValue(obj.smtpUser),
    smtpPass: '',
    smtpPasswordSet: Boolean(secret),
    from: stringValue(obj.from),
    to: normalizeRecipients(obj.to),
  };
}

export function toPublicWechatConfig(raw: unknown): PublicWechatConfig {
  const obj = asObject(raw);
  const webhookUrl = tryReadSecret(obj.webhookUrl, WECHAT_WEBHOOK_PURPOSE);
  return {
    webhookUrl: '',
    webhookConfigured: Boolean(webhookUrl),
  };
}

export function toPublicTelegramConfig(raw: unknown): PublicTelegramConfig {
  const obj = asObject(raw);
  const botToken = tryReadSecret(obj.botToken, TELEGRAM_TOKEN_PURPOSE);
  return {
    botToken: '',
    chatId: stringValue(obj.chatId),
    botTokenSet: Boolean(botToken),
  };
}

export function toPublicDingtalkConfig(raw: unknown): PublicDingtalkConfig {
  const obj = asObject(raw);
  const webhookUrl = tryReadSecret(obj.webhookUrl, DINGTALK_WEBHOOK_PURPOSE);
  const secret = tryReadSecret(obj.secret, DINGTALK_SECRET_PURPOSE);
  return {
    webhookUrl: '',
    webhookConfigured: Boolean(webhookUrl),
    secretConfigured: Boolean(secret),
  };
}

export function toPublicBarkConfig(raw: unknown): PublicBarkConfig {
  const obj = asObject(raw);
  const deviceKey = tryReadSecret(obj.deviceKey, BARK_KEY_PURPOSE);
  return {
    serverUrl: stringValue(obj.serverUrl) || 'https://api.day.app',
    deviceKey: '',
    deviceKeySet: Boolean(deviceKey),
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
