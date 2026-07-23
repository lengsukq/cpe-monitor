import { db } from './db';
import { APP_TIME_ZONE, parseTimestampMs } from './date-time';
import { bitsPerSecondToMegabits, bytesToMebibytes } from './traffic-units';
import {
  getAlertMetricDefinition,
  getAlertSeverity,
  isAlertMetricType,
  type AlertMetricType,
  type AlertSeverity,
} from './alert-metrics';
import type { AlertRuleRow } from './mappers/alert-rule';
import { readNotificationConfig } from './settings-store';
import { sendAlertNotification } from './notifiers/email';
import { sendAlertWechat } from './notifiers/wechat';

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
  metricType: AlertMetricType;
  severity: AlertSeverity;
  guidance: string[];
  collectionId: number | null;
  networkType: string | null;
  band: string | null;
  cellId: string | null;
  pci: string | null;
}

function parseAlertTimestamp(value: string): number {
  return parseTimestampMs(value) ?? 0;
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

const TRAFFIC_COLUMNS = `
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
`;

function getLatestTrafficRow(collectionId?: number): AlertTrafficRow | undefined {
  if (collectionId !== undefined) {
    return db.prepare(
      `SELECT ${TRAFFIC_COLUMNS}
       FROM traffic_data
       WHERE collection_id = ?
       ORDER BY id DESC
       LIMIT 1`,
    ).get(collectionId) as AlertTrafficRow | undefined;
  }
  return db.prepare(
    `SELECT ${TRAFFIC_COLUMNS}
     FROM traffic_data
     ORDER BY id DESC
     LIMIT 1`,
  ).get() as AlertTrafficRow | undefined;
}

function evaluateRule(rule: AlertRuleRow): AlertMetricEvaluation | null {
  if (!isAlertMetricType(rule.metric_type)) return null;

  const metricType = rule.metric_type;
  const definition = getAlertMetricDefinition(metricType);
  let value: number | null = null;
  let collectionId: number | null = null;
  let networkType: string | null = null;
  let band: string | null = null;
  let cellId: string | null = null;
  let pci: string | null = null;

  if (metricType === 'collection_failures') {
    value = getConsecutiveCollectionFailures();
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
    if (latestRun && latestRun.status !== 'success') return null;

    const latestTraffic = getLatestTrafficRow(latestRun?.id);
    if (!latestTraffic) return null;

    collectionId = latestTraffic.collection_id;
    networkType = latestTraffic.network_type;
    band = latestTraffic.band;
    cellId = latestTraffic.cell_id;
    pci = latestTraffic.pci;

    switch (metricType) {
      case 'traffic_up':
        value = bytesToMebibytes(latestTraffic.delta_upload_bytes || 0);
        break;
      case 'traffic_down':
        value = bytesToMebibytes(latestTraffic.delta_download_bytes || 0);
        break;
      case 'upload_rate':
        value = bitsPerSecondToMegabits(latestTraffic.upload_bps || 0);
        break;
      case 'download_rate':
        value = bitsPerSecondToMegabits(latestTraffic.download_bps || 0);
        break;
      case 'devices':
        value = latestTraffic.connected_devices || 0;
        break;
      case 'signal':
        value = latestTraffic.signal_strength;
        break;
      case 'rsrp':
        value = latestTraffic.rsrp;
        break;
      case 'rsrq':
        value = latestTraffic.rsrq;
        break;
      case 'sinr':
        value = latestTraffic.sinr;
        break;
      case 'rssi':
        value = latestTraffic.rssi;
        break;
      default:
        return null;
    }
  }

  if (value === null || !Number.isFinite(value)) return null;
  return {
    triggered: compareAlertValue(value, rule.operator, rule.threshold),
    value,
    label: definition.label,
    unit: definition.unit,
    metricType,
    severity: getAlertSeverity(metricType, value),
    guidance: [...definition.guidance],
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

      const timestamp = new Date().toLocaleString('zh-CN', { timeZone: APP_TIME_ZONE });
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

