import { db } from '@/lib/db';
import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { mapAlertRuleRow, mapAlertRuleRows, type AlertRuleRow } from '@/lib/mappers/alert-rule';
import { isAlertMetricType, isAlertOperator } from '@/lib/alert-metrics';
import type { AlertRule } from '@/types';

interface AlertRuleWriteBody {
  id?: number;
  name: string;
  metricType: AlertRule['metricType'];
  threshold: number;
  operator: AlertRule['operator'];
  enabled: boolean;
  notifyEmail: boolean;
  notifyWechat: boolean;
  cooldownMinutes?: number;
}

function validateRuleBody(body: AlertRuleWriteBody) {
  if (!body.name?.trim() || body.name.trim().length > 100) {
    throw new ApiError('规则名称不能为空且不能超过 100 个字符', 400);
  }
  if (!isAlertMetricType(body.metricType)) {
    throw new ApiError('不支持的监控指标', 400);
  }
  if (!isAlertOperator(body.operator)) {
    throw new ApiError('不支持的运算符', 400);
  }
  if (!Number.isFinite(body.threshold)) {
    throw new ApiError('阈值必须是有效数字', 400);
  }
  if (
    body.cooldownMinutes !== undefined
    && (!Number.isInteger(body.cooldownMinutes)
      || body.cooldownMinutes < 1
      || body.cooldownMinutes > 10080)
  ) {
    throw new ApiError('冷却时间必须是 1 到 10080 之间的整数分钟', 400);
  }
}

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  const rows = db.prepare('SELECT * FROM alert_rules ORDER BY created_at').all() as AlertRuleRow[];
  return jsonOk(mapAlertRuleRows(rows));
}, '获取告警规则失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();
  const body = await parseJsonBody<AlertRuleWriteBody>(request);
  validateRuleBody(body);

  db.prepare(
    'INSERT INTO alert_rules (name, metric_type, threshold, operator, enabled, notify_email, notify_wechat, cooldown_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    body.name.trim(),
    body.metricType,
    body.threshold,
    body.operator,
    body.enabled ? 1 : 0,
    body.notifyEmail ? 1 : 0,
    body.notifyWechat ? 1 : 0,
    body.cooldownMinutes || 30,
  );

  const newRule = db.prepare('SELECT * FROM alert_rules ORDER BY id DESC LIMIT 1').get() as AlertRuleRow;
  return jsonOk(mapAlertRuleRow(newRule));
}, '创建告警规则失败');

export const PUT = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();
  const body = await parseJsonBody<AlertRuleWriteBody>(request);
  if (!body.id) {
    throw new ApiError('缺少规则ID', 400);
  }
  validateRuleBody(body);

  db.prepare(
    'UPDATE alert_rules SET name=?, metric_type=?, threshold=?, operator=?, enabled=?, notify_email=?, notify_wechat=?, cooldown_minutes=? WHERE id=?',
  ).run(
    body.name.trim(),
    body.metricType,
    body.threshold,
    body.operator,
    body.enabled ? 1 : 0,
    body.notifyEmail ? 1 : 0,
    body.notifyWechat ? 1 : 0,
    body.cooldownMinutes || 30,
    body.id,
  );

  return jsonOk({ success: true });
}, '更新告警规则失败');

export const DELETE = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    throw new ApiError('缺少规则ID', 400);
  }

  db.prepare('DELETE FROM alert_rules WHERE id = ?').run(parseInt(id, 10));
  return jsonOk({ success: true });
}, '删除告警规则失败');
