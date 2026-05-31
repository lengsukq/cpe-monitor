import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').default("datetime('now')"),
});

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const cpeConfig = sqliteTable('cpe_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cpeUrl: text('cpe_url').notNull().default('http://192.168.31.1'),
  cpeUsername: text('cpe_username').default('admin'),
  cpePasswordEncrypted: text('cpe_password_encrypted'),
  updatedAt: text('updated_at').default("datetime('now')"),
});

export const notificationConfig = sqliteTable('notification_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  config: text('config').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  updatedAt: text('updated_at').default("datetime('now')"),
});

export const trafficData = sqliteTable('traffic_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').default("datetime('now')"),
  uploadBytes: integer('upload_bytes'),
  downloadBytes: integer('download_bytes'),
  connectedDevices: integer('connected_devices'),
  signalStrength: integer('signal_strength'),
});

export const deviceData = sqliteTable('device_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: text('timestamp').default("datetime('now')"),
  deviceName: text('device_name'),
  deviceIp: text('device_ip'),
  deviceMac: text('device_mac'),
  uploadBytes: integer('upload_bytes'),
  downloadBytes: integer('download_bytes'),
  onlineDuration: integer('online_duration'),
});

export const alertRules = sqliteTable('alert_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  metricType: text('metric_type').notNull(),
  threshold: real('threshold').notNull(),
  operator: text('operator').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  notifyEmail: integer('notify_email', { mode: 'boolean' }).default(true),
  notifyWechat: integer('notify_wechat', { mode: 'boolean' }).default(true),
  cooldownMinutes: integer('cooldown_minutes').default(30),
  createdAt: text('created_at').default("datetime('now')"),
});

export const alertLogs = sqliteTable('alert_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ruleId: integer('rule_id').references(() => alertRules.id),
  triggeredAt: text('triggered_at').default("datetime('now')"),
  message: text('message'),
  notified: integer('notified', { mode: 'boolean' }).default(false),
});

export const systemLogs = sqliteTable('system_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').default("datetime('now')"),
});

export const dailyReports = sqliteTable('daily_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reportDate: text('report_date').notNull(),
  totalUpload: integer('total_upload'),
  totalDownload: integer('total_download'),
  peakHour: integer('peak_hour'),
  topDevices: text('top_devices'),
  avgSignal: integer('avg_signal'),
  uptimePercent: real('uptime_percent'),
  networkQuality: text('network_quality'),
  sentAt: text('sent_at'),
  createdAt: text('created_at').default("datetime('now')"),
});
