import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

// ─── users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').default("datetime('now')"),
});

// ─── system_settings ──────────────────────────────────────────────────────────
export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ─── cpe_config ───────────────────────────────────────────────────────────────
export const cpeConfig = sqliteTable('cpe_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cpeUrl: text('cpe_url').notNull().default('http://192.168.31.1'),
  cpeUsername: text('cpe_username').default('admin'),
  cpePasswordEncrypted: text('cpe_password_encrypted'),
  updatedAt: text('updated_at').default("datetime('now')"),
});

// ─── cpe_sessions ─────────────────────────────────────────────────────────────
export const cpeSessions = sqliteTable('cpe_sessions', {
  profileKey: text('profile_key').primaryKey(),
  cpeUrl: text('cpe_url').notNull(),
  cpeUsername: text('cpe_username').notNull(),
  encryptedPayload: text('encrypted_payload').notNull(),
  updatedAt: text('updated_at').default("datetime('now')"),
});

// ─── collection_runs ──────────────────────────────────────────────────────────
export const collectionRuns = sqliteTable('collection_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').default("datetime('now')"),
  completedAt: text('completed_at'),
  status: text('status').notNull().default('running'),
  source: text('source').notNull().default('scheduler'),
  connectedDevices: integer('connected_devices').default(0),
  errorMessage: text('error_message'),
}, (table) => [
  index('idx_collection_runs_status_completed').on(table.status, table.completedAt),
]);

// ─── notification_config ──────────────────────────────────────────────────────
export const notificationConfig = sqliteTable('notification_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  config: text('config').notNull(),
  enabled: integer('enabled').default(1),
  updatedAt: text('updated_at').default("datetime('now')"),
}, (table) => [
  uniqueIndex('idx_notification_config_type_unique').on(table.type),
]);

// ─── traffic_data ─────────────────────────────────────────────────────────────
export const trafficData = sqliteTable('traffic_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  collectionId: integer('collection_id').references(() => collectionRuns.id),
  timestamp: text('timestamp').default("datetime('now')"),
  uploadBytes: integer('upload_bytes'),
  downloadBytes: integer('download_bytes'),
  deltaUploadBytes: integer('delta_upload_bytes'),
  deltaDownloadBytes: integer('delta_download_bytes'),
  uploadBps: real('upload_bps'),
  downloadBps: real('download_bps'),
  connectedDevices: integer('connected_devices'),
  signalStrength: integer('signal_strength'),
  networkType: text('network_type'),
  band: text('band'),
  cellId: text('cell_id'),
  pci: text('pci'),
  rsrp: real('rsrp'),
  rsrq: real('rsrq'),
  sinr: real('sinr'),
  rssi: real('rssi'),
}, (table) => [
  index('idx_traffic_data_timestamp').on(table.timestamp),
  index('idx_traffic_data_collection').on(table.collectionId),
]);

// ─── device_data ──────────────────────────────────────────────────────────────
export const deviceData = sqliteTable('device_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  collectionId: integer('collection_id').references(() => collectionRuns.id),
  timestamp: text('timestamp').default("datetime('now')"),
  deviceName: text('device_name'),
  deviceIp: text('device_ip'),
  deviceMac: text('device_mac'),
  uploadBytes: integer('upload_bytes'),
  downloadBytes: integer('download_bytes'),
  deltaUploadBytes: integer('delta_upload_bytes'),
  deltaDownloadBytes: integer('delta_download_bytes'),
  uploadBps: real('upload_bps'),
  downloadBps: real('download_bps'),
  onlineDuration: integer('online_duration'),
  active: integer('active').default(1),
  interfaceType: text('interface_type'),
  frequency: text('frequency'),
  rssi: real('rssi'),
  rawJson: text('raw_json'),
}, (table) => [
  index('idx_device_data_mac_timestamp').on(table.deviceMac, table.timestamp),
  index('idx_device_data_collection').on(table.collectionId),
  index('idx_device_data_timestamp').on(table.timestamp),
]);

// ─── alert_rules ──────────────────────────────────────────────────────────────
export const alertRules = sqliteTable('alert_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  metricType: text('metric_type').notNull(),
  threshold: real('threshold').notNull(),
  operator: text('operator').notNull(),
  enabled: integer('enabled').default(1),
  notifyEmail: integer('notify_email').default(1),
  notifyWechat: integer('notify_wechat').default(1),
  cooldownMinutes: integer('cooldown_minutes').default(30),
  createdAt: text('created_at').default("datetime('now')"),
});

// ─── alert_logs ───────────────────────────────────────────────────────────────
export const alertLogs = sqliteTable('alert_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ruleId: integer('rule_id').references(() => alertRules.id),
  triggeredAt: text('triggered_at').default("datetime('now')"),
  message: text('message'),
  notified: integer('notified').default(0),
}, (table) => [
  index('idx_alert_logs_rule_triggered').on(table.ruleId, table.triggeredAt),
]);

// ─── system_logs ──────────────────────────────────────────────────────────────
export const systemLogs = sqliteTable('system_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').default("datetime('now')"),
});

// ─── daily_reports ────────────────────────────────────────────────────────────
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
}, (table) => [
  uniqueIndex('idx_daily_reports_date_unique').on(table.reportDate),
]);

// ─── sms_messages ─────────────────────────────────────────────────────────────
export const smsMessages = sqliteTable('sms_messages', {
  fingerprint: text('fingerprint').primaryKey(),
  messageId: text('message_id'),
  phone: text('phone').notNull(),
  content: text('content').notNull(),
  receivedAt: text('received_at'),
  unread: integer('unread').default(0),
  direction: text('direction').default('inbound'),
  notified: integer('notified').default(0),
  rawJson: text('raw_json'),
  createdAt: text('created_at').default("datetime('now')"),
}, (table) => [
  index('idx_sms_messages_received_at').on(table.receivedAt),
  index('idx_sms_messages_unread_received_at').on(table.unread, table.receivedAt),
]);

// ─── cpe_device_snapshots ─────────────────────────────────────────────────────
export const cpeDeviceSnapshots = sqliteTable('cpe_device_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  collectedAt: text('collected_at').notNull().default("datetime('now')"),
  source: text('source').notNull().default('scheduler'),
  deviceName: text('device_name'),
  friendlyName: text('friendly_name'),
  productNameZh: text('product_name_zh'),
  productNameEn: text('product_name_en'),
  softwareVersion: text('software_version'),
  hardwareVersion: text('hardware_version'),
  webuiVersion: text('webui_version'),
  workmode: text('workmode'),
  supportmode: text('supportmode'),
  imei: text('imei'),
  imsi: text('imsi'),
  iccid: text('iccid'),
  msisdn: text('msisdn'),
  serialNumber: text('serial_number'),
  mccmnc: text('mccmnc'),
  macAddress1: text('mac_address1'),
  wanIp: text('wan_ip'),
  wanIpv6: text('wan_ipv6'),
  uptimeSeconds: integer('uptime_seconds'),
  carrier: text('carrier'),
  plmnCode: text('plmn_code'),
  networkType: text('network_type'),
  connectionStatus: text('connection_status'),
  simStatus: text('sim_status'),
  payloadJson: text('payload_json').notNull(),
}, (table) => [
  index('idx_cpe_device_snapshots_collected').on(table.collectedAt),
]);

// ─── cpe_device_profile ───────────────────────────────────────────────────────
export const cpeDeviceProfile = sqliteTable('cpe_device_profile', {
  id: integer('id').primaryKey(),
  updatedAt: text('updated_at').notNull().default("datetime('now')"),
  source: text('source').notNull().default('scheduler'),
  deviceName: text('device_name'),
  friendlyName: text('friendly_name'),
  productNameZh: text('product_name_zh'),
  productNameEn: text('product_name_en'),
  softwareVersion: text('software_version'),
  hardwareVersion: text('hardware_version'),
  webuiVersion: text('webui_version'),
  workmode: text('workmode'),
  supportmode: text('supportmode'),
  imei: text('imei'),
  imsi: text('imsi'),
  iccid: text('iccid'),
  msisdn: text('msisdn'),
  serialNumber: text('serial_number'),
  mccmnc: text('mccmnc'),
  macAddress1: text('mac_address1'),
  wanIp: text('wan_ip'),
  wanIpv6: text('wan_ipv6'),
  uptimeSeconds: integer('uptime_seconds'),
  carrier: text('carrier'),
  plmnCode: text('plmn_code'),
  networkType: text('network_type'),
  connectionStatus: text('connection_status'),
  simStatus: text('sim_status'),
  payloadJson: text('payload_json').notNull(),
});
