import cron, { ScheduledTask } from 'node-cron';
import crypto from 'crypto';
import { db, initializeDatabase, toSqliteTimestamp } from './db';
import { getOrCreateCpeClient } from './cpe-client';
import { generateDailyReport } from './report-generator';
import { formatBytes } from './format';
import { sendAlertNotification, sendDailyReport, sendSmsNotification } from './notifiers/email';
import { sendAlertWechat, sendDailyReportWechat, sendSmsWechat } from './notifiers/wechat';
import {
  getSettingsMap,
  isCpeConfigured,
  readNotificationConfig,
  setSetting,
} from './settings-store';
import type { AlertRuleRow } from './mappers/alert-rule';
import { cleanupHistoricalData } from './data-retention';

export const SMS_SYNC_MIN_INTERVAL = 1;
export const SMS_SYNC_MAX_INTERVAL = 1440;

export interface SmsSyncStatus {
  enabled: boolean;
  interval: number;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface SmsSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  notificationsSent: number;
  firstSync: boolean;
  syncedAt: string;
}

let hourlyTask: ScheduledTask | null = null;
let dailyTask: ScheduledTask | null = null;
let smsSyncTask: ReturnType<typeof setInterval> | null = null;
let smsSyncPromise: Promise<SmsSyncResult> | null = null;

function getSmsSyncInterval(value: string | undefined): number {
  const interval = Number(value || 15);
  if (!Number.isInteger(interval)) return 15;
  return Math.min(SMS_SYNC_MAX_INTERVAL, Math.max(SMS_SYNC_MIN_INTERVAL, interval));
}

function updateSmsSyncMetadata(lastSyncedAt: string | null, lastError: string | null) {
  if (lastSyncedAt !== null) setSetting('sms_last_sync_at', lastSyncedAt);
  if (lastError !== null) setSetting('sms_last_sync_error', lastError);
}

export function getSmsSyncStatus(): SmsSyncStatus {
  initializeDatabase();
  const settings = getSettingsMap();
  const lastSyncedAt = settings.sms_last_sync_at || null;
  const lastError = settings.sms_last_sync_error || null;

  return {
    enabled: settings.sms_sync_enabled !== 'false',
    interval: getSmsSyncInterval(settings.sms_sync_interval),
    running: smsSyncTask !== null,
    lastSyncedAt,
    lastError,
  };
}

export function isValidSmsSyncInterval(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= SMS_SYNC_MIN_INTERVAL
    && value <= SMS_SYNC_MAX_INTERVAL;
}

export async function startScheduler() {
  initializeDatabase();
  const settingsMap = getSettingsMap();
  const enabled = settingsMap.scheduler_enabled === 'true';

  if (!enabled) {
    stopScheduler();
  } else {
    const interval = parseInt(settingsMap.scheduler_interval || '60', 10);
    stopScheduler();

    const cronExpression = interval <= 5 ? '*/5 * * * *' : interval <= 15 ? '*/15 * * * *' : interval <= 30 ? '*/30 * * * *' : '0 * * * *';

    hourlyTask = cron.schedule(cronExpression, async () => {
      console.log('Running traffic collection...');
      await collectTrafficData();
      await checkAlerts();
    });

    dailyTask = cron.schedule('0 22 * * *', async () => {
      console.log('Generating daily report...');
      await generateAndSendDailyReport();
    });

    console.log(`Scheduler started with interval: ${interval} minutes`);
  }

  await ensureSmsSchedulerStarted();
}

// This remains the existing flow/alert scheduler stop operation. SMS has its own independent lifecycle.
export function stopScheduler() {
  if (hourlyTask) { hourlyTask.stop(); hourlyTask = null; }
  if (dailyTask) { dailyTask.stop(); dailyTask = null; }
}

export function getSchedulerStatus(): { running: boolean } {
  return { running: hourlyTask !== null };
}

export async function ensureSchedulerStarted() {
  initializeDatabase();
  const settings = getSettingsMap();

  if (settings.scheduler_enabled === 'true' && !getSchedulerStatus().running) {
    await startScheduler();
    return;
  }

  if (settings.scheduler_enabled !== 'true' && getSchedulerStatus().running) {
    stopScheduler();
  }

  await ensureSmsSchedulerStarted();
}

export async function restartSmsScheduler(): Promise<SmsSyncStatus> {
  initializeDatabase();
  stopSmsScheduler();

  const status = getSmsSyncStatus();
  if (!status.enabled) {
    console.log('SMS sync scheduler is disabled');
    return status;
  }

  smsSyncTask = setInterval(() => {
    void runScheduledSmsSync();
  }, status.interval * 60 * 1000);

  console.log(`SMS sync scheduler started with interval: ${status.interval} minutes`);
  void runScheduledSmsSync();
  return getSmsSyncStatus();
}

function stopSmsScheduler() {
  if (smsSyncTask) {
    clearInterval(smsSyncTask);
    smsSyncTask = null;
  }
}

async function ensureSmsSchedulerStarted() {
  const status = getSmsSyncStatus();
  if (status.enabled && !status.running) {
    await restartSmsScheduler();
  } else if (!status.enabled && status.running) {
    stopSmsScheduler();
  }
}

async function runScheduledSmsSync() {
  try {
    await syncSmsMessages();
  } catch (error) {
    console.error('Failed to sync SMS messages:', error);
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '短信同步失败';
}

export async function syncSmsMessages(): Promise<SmsSyncResult> {
  if (smsSyncPromise) return smsSyncPromise;

  const task = performSmsSync();
  smsSyncPromise = task;
  try {
    return await task;
  } finally {
    if (smsSyncPromise === task) smsSyncPromise = null;
  }
}

async function performSmsSync(): Promise<SmsSyncResult> {
  try {
    initializeDatabase();
    const client = getOrCreateCpeClient();
    const { messages } = await client.getSmsMessages();
    const existingCount = (
      db.prepare('SELECT COUNT(*) as count FROM sms_messages').get() as { count?: number } | undefined
    )?.count || 0;
    // Existing persisted messages from an upgrade are already a completed snapshot. A
    // dedicated flag also handles the case where the first successful sync is empty.
    const settings = getSettingsMap();
    const firstSync = settings.sms_initial_sync_completed !== 'true' && existingCount === 0;
    const emailConfig = readNotificationConfig('email');
    const wechatConfig = readNotificationConfig('wechat');
    let inserted = 0;
    let updated = 0;
    let notificationsSent = 0;

    for (const sms of messages) {
      const fingerprint = crypto.createHash('sha256')
        .update(`${sms.id}|${sms.phone}|${sms.date}|${sms.content}`)
        .digest('hex');
      const existing = db.prepare('SELECT fingerprint FROM sms_messages WHERE fingerprint = ?').get(fingerprint);
      if (existing) {
        db.prepare('UPDATE sms_messages SET unread = ?, raw_json = ? WHERE fingerprint = ?')
          .run(sms.unread ? 1 : 0, JSON.stringify(sms), fingerprint);
        updated += 1;
        continue;
      }

      let notified = firstSync ? 1 : 0;
      if (!firstSync && sms.direction === 'inbound') {
        let sent = false;
        if (emailConfig?.to && (Array.isArray(emailConfig.to) ? emailConfig.to.length > 0 : Boolean(emailConfig.to))) {
          sent = await sendSmsNotification(emailConfig, sms) || sent;
        }
        if (wechatConfig?.webhookUrl) {
          sent = await sendSmsWechat(wechatConfig, sms) || sent;
        }
        notified = sent ? 1 : 0;
        if (sent) notificationsSent += 1;
      }

      db.prepare(`
        INSERT INTO sms_messages
          (fingerprint, message_id, phone, content, received_at, unread, direction, notified, raw_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        fingerprint,
        sms.id,
        sms.phone,
        sms.content,
        sms.date,
        sms.unread ? 1 : 0,
        sms.direction,
        notified,
        JSON.stringify(sms),
      );
      inserted += 1;
    }

    const syncedAt = new Date().toISOString();
    setSetting('sms_initial_sync_completed', 'true');
    updateSmsSyncMetadata(syncedAt, '');
    console.log(`SMS sync completed: ${messages.length} messages${firstSync ? ' (initial snapshot)' : ''}`);
    return { fetched: messages.length, inserted, updated, notificationsSent, firstSync, syncedAt };
  } catch (error) {
    updateSmsSyncMetadata(null, getErrorMessage(error));
    throw error;
  }
}

interface PreviousTrafficSample {
  timestamp: string;
  upload_bytes: number | null;
  download_bytes: number | null;
}

interface PreviousDeviceSample {
  timestamp: string;
  upload_bytes: number | null;
  download_bytes: number | null;
}

export interface TrafficCollectionResult {
  collectionId: number | null;
  collectedDevices: number;
  success: boolean;
  error?: string;
}

function parseSqliteTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(`${value.replace(' ', 'T')}Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function computeCounterDelta(current: number, previous: number | null | undefined): number {
  if (previous === null || previous === undefined || current < previous) return 0;
  return current - previous;
}

function computeBitsPerSecond(deltaBytes: number, elapsedSeconds: number): number {
  if (deltaBytes <= 0 || elapsedSeconds <= 0) return 0;
  return (deltaBytes * 8) / elapsedSeconds;
}

export async function collectTrafficData(
  source: 'scheduler' | 'manual' = 'scheduler',
): Promise<TrafficCollectionResult> {
  let collectionId: number | null = null;
  try {
    if (!isCpeConfigured()) {
      console.log('No CPE config found');
      return {
        collectionId: null,
        collectedDevices: 0,
        success: false,
        error: 'CPE 未配置',
      };
    }

    const collectionResult = db.prepare(
      `INSERT INTO collection_runs (source, status)
       VALUES (?, 'running')`,
    ).run(source);
    collectionId = Number(collectionResult.lastInsertRowid);

    const client = getOrCreateCpeClient();
    const trafficInfo = await client.getTrafficData();
    const collectedAt = new Date();
    const collectedAtText = toSqliteTimestamp(collectedAt);
    const previousTraffic = db.prepare(
      `SELECT timestamp, upload_bytes, download_bytes
       FROM traffic_data
       ORDER BY id DESC
       LIMIT 1`,
    ).get() as PreviousTrafficSample | undefined;
    const previousTrafficTime = parseSqliteTimestamp(previousTraffic?.timestamp);
    const elapsedSeconds = previousTrafficTime === null
      ? 0
      : Math.max(0, (collectedAt.getTime() - previousTrafficTime) / 1000);
    const deltaUploadBytes = computeCounterDelta(
      trafficInfo.uploadBytes,
      previousTraffic?.upload_bytes,
    );
    const deltaDownloadBytes = computeCounterDelta(
      trafficInfo.downloadBytes,
      previousTraffic?.download_bytes,
    );

    const insertTraffic = db.prepare(
      `INSERT INTO traffic_data (
        collection_id, timestamp,
        upload_bytes, download_bytes,
        delta_upload_bytes, delta_download_bytes,
        upload_bps, download_bps,
        connected_devices, signal_strength,
        network_type, band, cell_id, pci,
        rsrp, rsrq, sinr, rssi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const findPreviousDevice = db.prepare(
      `SELECT timestamp, upload_bytes, download_bytes
       FROM device_data
       WHERE device_mac = ?
       ORDER BY id DESC
       LIMIT 1`,
    );
    const insertDevice = db.prepare(
      `INSERT INTO device_data (
        collection_id, timestamp,
        device_name, device_ip, device_mac,
        upload_bytes, download_bytes,
        delta_upload_bytes, delta_download_bytes,
        upload_bps, download_bps,
        online_duration, active,
        interface_type, frequency, rssi, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const persistCollection = db.transaction(() => {
      insertTraffic.run(
        collectionId,
        collectedAtText,
        trafficInfo.uploadBytes,
        trafficInfo.downloadBytes,
        deltaUploadBytes,
        deltaDownloadBytes,
        computeBitsPerSecond(deltaUploadBytes, elapsedSeconds),
        computeBitsPerSecond(deltaDownloadBytes, elapsedSeconds),
        trafficInfo.connectedDevices,
        trafficInfo.signalStrength,
        trafficInfo.networkType,
        trafficInfo.band,
        trafficInfo.cellId,
        trafficInfo.pci,
        trafficInfo.rsrp,
        trafficInfo.rsrq,
        trafficInfo.sinr,
        trafficInfo.rssi,
      );

      for (const device of trafficInfo.devices) {
        const previousDevice = device.mac
          ? findPreviousDevice.get(device.mac) as PreviousDeviceSample | undefined
          : undefined;
        const previousDeviceTime = parseSqliteTimestamp(previousDevice?.timestamp);
        const deviceElapsedSeconds = previousDeviceTime === null
          ? 0
          : Math.max(0, (collectedAt.getTime() - previousDeviceTime) / 1000);
        const deviceDeltaUpload = computeCounterDelta(
          device.uploadBytes,
          previousDevice?.upload_bytes,
        );
        const deviceDeltaDownload = computeCounterDelta(
          device.downloadBytes,
          previousDevice?.download_bytes,
        );

        insertDevice.run(
          collectionId,
          collectedAtText,
          device.name,
          device.ip,
          device.mac,
          device.uploadBytes,
          device.downloadBytes,
          deviceDeltaUpload,
          deviceDeltaDownload,
          computeBitsPerSecond(deviceDeltaUpload, deviceElapsedSeconds),
          computeBitsPerSecond(deviceDeltaDownload, deviceElapsedSeconds),
          device.onlineDuration,
          device.online ? 1 : 0,
          device.interfaceType,
          device.frequency,
          device.rssi,
          JSON.stringify(device.raw),
        );
      }

      db.prepare(
        `UPDATE collection_runs
         SET completed_at = ?, status = 'success', connected_devices = ?
         WHERE id = ?`,
      ).run(collectedAtText, trafficInfo.connectedDevices, collectionId);
    });
    persistCollection();

    try {
      const cleanup = cleanupHistoricalData();
      if (!cleanup.skipped) {
        console.log(
          `Historical cleanup: traffic=${cleanup.trafficDeleted}, devices=${cleanup.devicesDeleted}, runs=${cleanup.runsDeleted}`,
        );
      }
    } catch (cleanupError) {
      console.error('Historical cleanup failed:', cleanupError);
    }

    console.log(`Collected traffic data: ${trafficInfo.connectedDevices} devices`);
    return {
      collectionId,
      collectedDevices: trafficInfo.connectedDevices,
      success: true,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    if (collectionId !== null) {
      try {
        db.prepare(
          `UPDATE collection_runs
           SET completed_at = datetime('now'), status = 'failed', error_message = ?
           WHERE id = ?`,
        ).run(errorMessage, collectionId);
      } catch (updateError) {
        console.error('Failed to update collection failure state:', updateError);
      }
    }
    console.error('Failed to collect traffic data:', error);
    return {
      collectionId,
      collectedDevices: 0,
      success: false,
      error: errorMessage,
    };
  }
}

interface AlertLogTimestampRow {
  triggered_at: string;
}

interface AlertTrafficRow {
  collection_id: number | null;
  delta_upload_bytes: number | null;
  delta_download_bytes: number | null;
  upload_bps: number | null;
  download_bps: number | null;
  connected_devices: number | null;
  signal_strength: number | null;
  rsrp: number | null;
  rsrq: number | null;
  sinr: number | null;
  rssi: number | null;
  network_type: string | null;
  band: string | null;
  cell_id: string | null;
  pci: string | null;
}

interface AlertMetricEvaluation {
  triggered: boolean;
  value: number;
  label: string;
  unit: string;
  metricType: string;
  severity: 'info' | 'warning' | 'critical';
  guidance: string[];
  collectionId: number | null;
  networkType: string | null;
  band: string | null;
  cellId: string | null;
  pci: string | null;
}

function parseAlertTimestamp(value: string): number {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const parsed = new Date(normalized).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareAlertValue(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    default: return false;
  }
}

function getConsecutiveCollectionFailures(): number {
  const rows = db.prepare(
    `SELECT status
     FROM collection_runs
     ORDER BY id DESC
     LIMIT 20`,
  ).all() as Array<{ status: string }>;
  let failures = 0;
  for (const row of rows) {
    if (row.status !== 'failed') break;
    failures += 1;
  }
  return failures;
}

function getAlertSeverity(metricType: string, value: number): AlertMetricEvaluation['severity'] {
  switch (metricType) {
    case 'collection_failures': return value >= 3 ? 'critical' : 'warning';
    case 'rsrp': return value < -105 ? 'critical' : 'warning';
    case 'rsrq': return value < -20 ? 'critical' : 'warning';
    case 'sinr': return value < 0 ? 'critical' : 'warning';
    case 'rssi': return value < -95 ? 'critical' : 'warning';
    case 'devices': return 'info';
    default: return 'warning';
  }
}

function getAlertGuidance(metricType: string): string[] {
  switch (metricType) {
    case 'collection_failures':
      return [
        '检查 CPE 管理地址能否从服务端访问，以及设备是否正在重启。',
        '检查持久化会话是否失效，并确认 CPE 密码和登录限制。',
        '查看采集批次错误信息，确认是否存在接口超时或并发访问。',
      ];
    case 'rsrp':
    case 'rssi':
      return [
        '检查 CPE 摆放位置、天线方向和室内遮挡。',
        '对比过去 24 小时趋势，确认是持续覆盖不足还是瞬时波动。',
        '观察频段和 Cell ID 是否发生切换。',
      ];
    case 'rsrq':
    case 'sinr':
      return [
        '检查当前频段是否存在明显干扰或高负载。',
        '对比 RSRP：信号强但质量差通常更可能是干扰问题。',
        '观察小区、PCI 和频段切换后指标是否恢复。',
      ];
    case 'traffic_up':
    case 'traffic_down':
    case 'upload_rate':
    case 'download_rate':
      return [
        '查看在线设备排行，确认主要流量来源。',
        '检查是否有系统更新、云备份、下载或视频任务。',
        '结合套餐用量和连续采集趋势判断是否需要限制设备。',
      ];
    case 'devices':
      return [
        '检查在线设备列表是否出现陌生终端。',
        '核对设备名称、IP、MAC 和接入频段。',
      ];
    default:
      return ['查看仪表盘历史趋势并核对最近采集状态。'];
  }
}

function evaluateRule(rule: AlertRuleRow): AlertMetricEvaluation | null {
  let value: number | null = null;
  let label = '';
  let unit = '';
  let collectionId: number | null = null;
  let networkType: string | null = null;
  let band: string | null = null;
  let cellId: string | null = null;
  let pci: string | null = null;

  if (rule.metric_type === 'collection_failures') {
    value = getConsecutiveCollectionFailures();
    label = '连续采集失败';
    unit = '次';
    const latestRun = db.prepare(
      'SELECT id FROM collection_runs ORDER BY id DESC LIMIT 1',
    ).get() as { id: number } | undefined;
    collectionId = latestRun?.id || null;
  } else {
    const latestRun = db.prepare(
      `SELECT id, status
       FROM collection_runs
       ORDER BY id DESC
       LIMIT 1`,
    ).get() as { id: number; status: string } | undefined;
    // Do not evaluate normal metric rules against stale traffic when the most
    // recent collection failed. Failure-specific rules are handled above.
    if (latestRun && latestRun.status !== 'success') return null;

    const latestTraffic = latestRun ? db.prepare(
      `SELECT
         collection_id,
         delta_upload_bytes,
         delta_download_bytes,
         upload_bps,
         download_bps,
         connected_devices,
         signal_strength,
         rsrp,
         rsrq,
         sinr,
         rssi,
         network_type,
         band,
         cell_id,
         pci
       FROM traffic_data
       WHERE collection_id = ?
       ORDER BY id DESC
       LIMIT 1`,
    ).get(latestRun.id) as AlertTrafficRow | undefined : db.prepare(
      `SELECT
         collection_id,
         delta_upload_bytes,
         delta_download_bytes,
         upload_bps,
         download_bps,
         connected_devices,
         signal_strength,
         rsrp,
         rsrq,
         sinr,
         rssi,
         network_type,
         band,
         cell_id,
         pci
       FROM traffic_data
       ORDER BY id DESC
       LIMIT 1`,
    ).get() as AlertTrafficRow | undefined;
    if (!latestTraffic) return null;
    collectionId = latestTraffic.collection_id;
    networkType = latestTraffic.network_type;
    band = latestTraffic.band;
    cellId = latestTraffic.cell_id;
    pci = latestTraffic.pci;

    switch (rule.metric_type) {
      case 'traffic_up':
        value = (latestTraffic.delta_upload_bytes || 0) / 1024 / 1024;
        label = '区间上传流量';
        unit = 'MB';
        break;
      case 'traffic_down':
        value = (latestTraffic.delta_download_bytes || 0) / 1024 / 1024;
        label = '区间下载流量';
        unit = 'MB';
        break;
      case 'upload_rate':
        value = (latestTraffic.upload_bps || 0) / 1_000_000;
        label = '平均上传速率';
        unit = 'Mbps';
        break;
      case 'download_rate':
        value = (latestTraffic.download_bps || 0) / 1_000_000;
        label = '平均下载速率';
        unit = 'Mbps';
        break;
      case 'devices':
        value = latestTraffic.connected_devices || 0;
        label = '在线设备数量';
        unit = '台';
        break;
      case 'signal':
        value = latestTraffic.signal_strength;
        label = '兼容信号强度';
        unit = 'dBm';
        break;
      case 'rsrp':
        value = latestTraffic.rsrp;
        label = 'RSRP';
        unit = 'dBm';
        break;
      case 'rsrq':
        value = latestTraffic.rsrq;
        label = 'RSRQ';
        unit = 'dB';
        break;
      case 'sinr':
        value = latestTraffic.sinr;
        label = 'SINR';
        unit = 'dB';
        break;
      case 'rssi':
        value = latestTraffic.rssi;
        label = 'RSSI';
        unit = 'dBm';
        break;
      default:
        return null;
    }
  }

  if (value === null || !Number.isFinite(value)) return null;
  return {
    triggered: compareAlertValue(value, rule.operator, rule.threshold),
    value,
    label,
    unit,
    metricType: rule.metric_type,
    severity: getAlertSeverity(rule.metric_type, value),
    guidance: getAlertGuidance(rule.metric_type),
    collectionId,
    networkType,
    band,
    cellId,
    pci,
  };
}

export async function checkAlerts(): Promise<number> {
  let triggeredCount = 0;
  try {
    const rules = db.prepare('SELECT * FROM alert_rules WHERE enabled = 1').all() as AlertRuleRow[];

    for (const rule of rules) {
      const evaluation = evaluateRule(rule);
      if (!evaluation?.triggered) continue;

      const recentAlert = db.prepare(
        'SELECT triggered_at FROM alert_logs WHERE rule_id = ? ORDER BY triggered_at DESC LIMIT 1',
      ).get(rule.id) as AlertLogTimestampRow | undefined;
      if (recentAlert) {
        const lastAlertTime = parseAlertTimestamp(recentAlert.triggered_at);
        const cooldownMs = (rule.cooldown_minutes || 30) * 60 * 1000;
        if (Date.now() - lastAlertTime < cooldownMs) continue;
      }

      const displayValue = Number.isInteger(evaluation.value)
        ? String(evaluation.value)
        : evaluation.value.toFixed(2);
      const message = `CPE 监控规则“${rule.name}”已触发：${evaluation.label}当前为 ${displayValue} ${evaluation.unit}，条件为 ${rule.operator} ${rule.threshold} ${evaluation.unit}`;
      const log = db.prepare(
        'INSERT INTO alert_logs (rule_id, message, notified) VALUES (?, ?, ?)',
      ).run(rule.id, message, 0);
      let notified = false;

      const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      if (rule.notify_email) {
        const emailConfig = readNotificationConfig('email');
        if (emailConfig) {
          notified = await sendAlertNotification(
            emailConfig,
            {
              ruleName: rule.name,
              message,
              timestamp,
              metricType: evaluation.metricType,
              metricLabel: evaluation.label,
              currentValue: evaluation.value,
              unit: evaluation.unit,
              operator: rule.operator,
              threshold: rule.threshold,
              severity: evaluation.severity,
              networkType: evaluation.networkType,
              band: evaluation.band,
              cellId: evaluation.cellId,
              pci: evaluation.pci,
              collectionId: evaluation.collectionId,
              guidance: evaluation.guidance,
            },
          ) || notified;
        }
      }
      if (rule.notify_wechat) {
        const wechatConfig = readNotificationConfig('wechat');
        if (wechatConfig?.webhookUrl) {
          notified = await sendAlertWechat(
            wechatConfig,
            { ruleName: rule.name, message, timestamp },
          ) || notified;
        }
      }
      db.prepare('UPDATE alert_logs SET notified = ? WHERE id = ?')
        .run(notified ? 1 : 0, log.lastInsertRowid);
      console.log(`Alert triggered: ${rule.name}`);
      triggeredCount += 1;
    }
  } catch (error) {
    console.error('Failed to check alerts:', error);
  }
  return triggeredCount;
}

async function generateAndSendDailyReport() {
  try {
    const report = await generateDailyReport();

    db.prepare('INSERT INTO daily_reports (report_date, total_upload, total_download, peak_hour, top_devices, avg_signal, uptime_percent, network_quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(report.reportDate, report.totalUpload, report.totalDownload, report.peakHour, JSON.stringify(report.topDevices || []), report.avgSignal, report.uptimePercent, report.networkQuality);

    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const emailConfig = readNotificationConfig('email');
    const wechatConfig = readNotificationConfig('wechat');
    let sent = false;
    if (emailConfig) sent = await sendDailyReport(emailConfig, report) || sent;
    if (wechatConfig?.webhookUrl) {
      sent = await sendDailyReportWechat(wechatConfig, {
        date: report.reportDate,
        totalDownload: formatBytes(report.totalDownload),
        totalUpload: formatBytes(report.totalUpload),
        deviceCount: report.topDevices?.length || 0,
        networkQuality: report.networkQuality || '数据不足',
        avgSignal: report.avgSignal || 0,
      }) || sent;
    }
    if (sent) db.prepare('UPDATE daily_reports SET sent_at = ? WHERE report_date = ?').run(timestamp, report.reportDate);

    console.log('Daily report generated and stored');
  } catch (error) {
    console.error('Failed to generate daily report:', error);
  }
}
