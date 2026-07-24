export type SettingsSectionId =
  | 'connection'
  | 'automation'
  | 'deviceInfo'
  | 'retention'
  | 'quota'
  | 'email'
  | 'wechat';

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

export interface SyncConfigForm {
  enabled: boolean;
  interval: string;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

/** @deprecated Use SyncConfigForm instead */
export type SmsSyncConfigForm = SyncConfigForm;

/** @deprecated Use SyncConfigForm instead */
export type DeviceInfoSyncConfigForm = SyncConfigForm;

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

export interface DataQuotaForm {
  enabled: boolean;
  quotaGb: string;
  alertLevels: string; // comma-separated percentages e.g. "80,90,100"
  resetDay: string;
}
