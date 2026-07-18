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

export interface AlertLogWithRuleName extends AlertLog {
  ruleName: string | null;
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


export interface NetworkSnapshot {
  connectionStatus?: string;
  networkType?: string;
  signalStrength?: number;
  carrier?: string;
  band?: string;
  cellId?: string;
  pci?: string | number;
  rsrp?: string | number;
  rsrq?: string | number;
  sinr?: string | number;
  rssi?: string | number;
  nrarfcn?: string | number;
  cellInfo?: Record<string, unknown>;
  status?: Record<string, unknown>;
  signal?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DashboardOverviewResponse {
  currentUpload: number;
  currentDownload: number;
  connectedDevices: number;
  signalStrength: number;
  connectionStatus: string;
  updateState: string;
  networkType: string;
  networkSnapshot: NetworkSnapshot | null;
  source: 'cpe' | 'database';
  cpeError: string;
  schedulerStatus: SchedulerStatus & { running?: boolean };
}

export interface TrafficStatsResponse {
  CurrentUploadRate?: string;
  CurrentDownloadRate?: string;
  CurrentUpload?: string;
  CurrentDownload?: string;
  TotalUpload?: string;
  TotalDownload?: string;
  CurrentConnectTime?: string;
  TotalConnectTime?: string;
  CurrentMonthDownload?: string;
  CurrentMonthUpload?: string;
  [key: string]: unknown;
}

export interface DataPlanConfig {
  StartDay?: string | number;
  trafficmaxlimit?: string | number;
  MonthThreshold?: string | number;
  DayThreshold?: string | number;
  DataLimit?: string | number;
  [key: string]: unknown;
}

export interface SmsSyncStatusView {
  enabled: boolean;
  interval: number;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}
