import { db, ensureDatabaseReady } from '@/lib/db';
import { mapAlertLogRows, type AlertLogRow } from '@/lib/mappers/alert-log';
import { mapAlertRuleRow, mapAlertRuleRows, type AlertRuleRow } from '@/lib/mappers/alert-rule';
import type { AlertLog, AlertRule } from '@/types';

export interface AlertRuleWriteInput {
  name: string;
  metricType: AlertRule['metricType'];
  threshold: number;
  operator: AlertRule['operator'];
  enabled: boolean;
  notifyEmail: boolean;
  notifyWechat: boolean;
  cooldownMinutes: number;
}

export function listAlertRules(): AlertRule[] {
  ensureDatabaseReady();
  const rows = db.prepare('SELECT * FROM alert_rules ORDER BY created_at').all() as AlertRuleRow[];
  return mapAlertRuleRows(rows);
}

export function createAlertRule(input: AlertRuleWriteInput): AlertRule {
  ensureDatabaseReady();
  const result = db.prepare(
    `INSERT INTO alert_rules
      (name, metric_type, threshold, operator, enabled, notify_email, notify_wechat, cooldown_minutes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.name,
    input.metricType,
    input.threshold,
    input.operator,
    input.enabled ? 1 : 0,
    input.notifyEmail ? 1 : 0,
    input.notifyWechat ? 1 : 0,
    input.cooldownMinutes,
  );
  const row = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(result.lastInsertRowid) as AlertRuleRow;
  return mapAlertRuleRow(row);
}

export function updateAlertRule(id: number, input: AlertRuleWriteInput): void {
  ensureDatabaseReady();
  db.prepare(
    `UPDATE alert_rules
     SET name = ?, metric_type = ?, threshold = ?, operator = ?, enabled = ?,
         notify_email = ?, notify_wechat = ?, cooldown_minutes = ?
     WHERE id = ?`,
  ).run(
    input.name,
    input.metricType,
    input.threshold,
    input.operator,
    input.enabled ? 1 : 0,
    input.notifyEmail ? 1 : 0,
    input.notifyWechat ? 1 : 0,
    input.cooldownMinutes,
    id,
  );
}

export function deleteAlertRule(id: number): void {
  ensureDatabaseReady();
  db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id);
}

export function listRecentAlertLogs(limit = 100): AlertLog[] {
  ensureDatabaseReady();
  const safeLimit = Math.min(500, Math.max(1, Math.floor(limit)));
  const rows = db.prepare(`
    SELECT al.id, al.rule_id, al.triggered_at, al.message, al.notified, ar.name AS rule_name
    FROM alert_logs al
    LEFT JOIN alert_rules ar ON al.rule_id = ar.id
    ORDER BY al.triggered_at DESC
    LIMIT ?
  `).all(safeLimit) as AlertLogRow[];
  return mapAlertLogRows(rows);
}

export interface AlertLogsPaginatedParams {
  page: number;
  pageSize: number;
  notified?: number;
  ruleId?: number;
}

export interface AlertLogsPaginatedResult {
  logs: AlertLog[];
  total: number;
  page: number;
  pageSize: number;
}

export function listAlertLogsPaginated(params: AlertLogsPaginatedParams): AlertLogsPaginatedResult {
  ensureDatabaseReady();
  const { page, pageSize, notified, ruleId } = params;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (notified !== undefined) {
    conditions.push('al.notified = ?');
    bindings.push(notified);
  }
  if (ruleId !== undefined) {
    conditions.push('al.rule_id = ?');
    bindings.push(ruleId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(
    `SELECT COUNT(*) AS count FROM alert_logs al ${whereClause}`,
  ).get(...bindings) as { count: number };
  const total = countRow.count;

  const rows = db.prepare(`
    SELECT al.id, al.rule_id, al.triggered_at, al.message, al.notified, ar.name AS rule_name
    FROM alert_logs al
    LEFT JOIN alert_rules ar ON al.rule_id = ar.id
    ${whereClause}
    ORDER BY al.triggered_at DESC
    LIMIT ? OFFSET ?
  `).all(...bindings, pageSize, offset) as AlertLogRow[];

  return {
    logs: mapAlertLogRows(rows),
    total,
    page,
    pageSize,
  };
}
