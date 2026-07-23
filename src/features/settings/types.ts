export type SettingsSectionId =
  | 'connection'
  | 'automation'
  | 'deviceInfo'
  | 'retention'
  | 'email'
  | 'wechat'
  | 'security';

export interface CpeConfigForm {
  cpeUrl: string;
  cpeUsername: string;
  cpePassword: string;
}

export interface EmailConfigForm {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  from: string;
  to: string;
}

export interface WechatConfigForm {
  webhookUrl: string;
}

export interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SmsSyncConfigForm {
  enabled: boolean;
  interval: string;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface DeviceInfoSyncConfigForm {
  enabled: boolean;
  interval: string;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface DataRetentionForm {
  historyDays: string;
  runDays: string;
  lastCleanupAt: string | null;
}

export interface UpdateStatusState {
  updateState?: string;
  message?: string;
  error?: string;
}

export interface TestResultState {
  success: boolean;
  message: string;
  latency?: string;
}

export interface SettingsMessage {
  type: 'success' | 'error' | '';
  text: string;
}

export interface SettingsActionContext {
  onMessage: (message: SettingsMessage) => void;
  onSaved: () => void;
}

export interface NotificationApiRow {
  type: string;
  config: string;
}

export interface PublicEmailApiConfig {
  smtpHost?: string;
  smtpPort?: string | number;
  smtpUser?: string;
  smtpPass?: string;
  smtpPasswordSet?: boolean;
  from?: string;
  to?: string | string[];
}

export interface PublicWechatApiConfig {
  webhookUrl?: string;
  webhookConfigured?: boolean;
}
