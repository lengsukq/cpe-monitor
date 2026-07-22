import {
  ApiError,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { isAlertMetricType, isAlertOperator } from '@/lib/alert-metrics';
import {
  createAlertRule,
  deleteAlertRule,
  listAlertRules,
  updateAlertRule,
  type AlertRuleWriteInput,
} from '@/lib/repositories/alert-repository';
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

function validateRuleBody(body: AlertRuleWriteBody): AlertRuleWriteInput {
  const name = body.name?.trim();
  if (!name || name.length > 100) throw new ApiError('规则名称不能为空且不能超过 100 个字符', 400);
  if (!isAlertMetricType(body.metricType)) throw new ApiError('不支持的监控指标', 400);
  if (!isAlertOperator(body.operator)) throw new ApiError('不支持的运算符', 400);
  if (!Number.isFinite(body.threshold)) throw new ApiError('阈值必须是有效数字', 400);
  const cooldownMinutes = body.cooldownMinutes || 30;
  if (!Number.isInteger(cooldownMinutes) || cooldownMinutes < 1 || cooldownMinutes > 10080) {
    throw new ApiError('冷却时间必须是 1 到 10080 之间的整数分钟', 400);
  }
  return { ...body, name, cooldownMinutes };
}

export const GET = withApiHandler(async () => {
  await requireSession();
  return jsonOk(listAlertRules());
}, '获取告警规则失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  const input = validateRuleBody(await parseJsonBody<AlertRuleWriteBody>(request));
  return jsonOk(createAlertRule(input));
}, '创建告警规则失败');

export const PUT = withApiHandler(async (request) => {
  await requireSession();
  const body = await parseJsonBody<AlertRuleWriteBody>(request);
  if (!body.id) throw new ApiError('缺少规则ID', 400);
  updateAlertRule(body.id, validateRuleBody(body));
  return jsonOk({ success: true });
}, '更新告警规则失败');

export const DELETE = withApiHandler(async (request) => {
  await requireSession();
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new ApiError('缺少规则ID', 400);
  deleteAlertRule(parseInt(id, 10));
  return jsonOk({ success: true });
}, '删除告警规则失败');
