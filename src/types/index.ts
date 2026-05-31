export interface TrafficData {
  id: number;
  timestamp: Date;
  uploadBytes: number | null;
  downloadBytes: number | null;
  connectedDevices: number | null;
  signalStrength: number | null;
}

export interface DeviceData {
  id: number;
  timestamp: Date;
  deviceName: string | null;
  deviceIp: string | null;
  deviceMac: string | null;
  uploadBytes: number | null;
  downloadBytes: number | null;
  onlineDuration: number | null;
}

export interface AlertRule {
  id: number;
  name: string;
  metricType: 'traffic_up' | 'traffic_down' | 'devices' | 'signal';
  threshold: number;
  operator: '>' | '<' | '>=' | '<=';
  enabled: boolean;
  notifyEmail: boolean;
  notifyWechat: boolean;
  cooldownMinutes: number;
  createdAt: Date | null;
}

export interface AlertLog {
  id: number;
  ruleId: number | null;
  triggeredAt: Date | null;
  message: string | null;
  notified: boolean | null;
}

export interface NotificationConfig {
  id: number;
  type: 'email' | 'wechat';
  config: EmailConfig | WechatConfig;
  enabled: boolean | null;
  updatedAt: Date | null;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  from: string;
  to: string[];
}

export interface WechatConfig {
  webhookUrl: string;
}

export interface CpeConfig {
  id: number;
  cpeUrl: string;
  cpeUsername: string | null;
  cpePasswordEncrypted: string | null;
  updatedAt: Date | null;
}

export interface DailyReport {
  id: number;
  reportDate: string;
  totalUpload: number | null;
  totalDownload: number | null;
  peakHour: number | null;
  topDevices: DeviceRanking[] | null;
  avgSignal: number | null;
  uptimePercent: number | null;
  networkQuality: string | null;
  sentAt: Date | null;
  createdAt: Date | null;
}

export interface DeviceRanking {
  name: string;
  ip: string;
  mac: string;
  uploadBytes: number;
  downloadBytes: number;
  totalBytes: number;
}

export interface SchedulerStatus {
  enabled: boolean;
  interval: number;
}

export interface DashboardOverview {
  currentUpload: number;
  currentDownload: number;
  connectedDevices: number;
  signalStrength: number;
  schedulerStatus: SchedulerStatus;
}

export interface TrafficHistoryPoint {
  timestamp: string;
  upload: number;
  download: number;
  devices: number;
}
