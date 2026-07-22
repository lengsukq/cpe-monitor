import {
  ALERT_METRIC_DEFINITIONS,
  ALERT_METRIC_TYPES,
  ALERT_OPERATORS,
} from '../../lib/alert-metrics.ts';
import type { AlertRule } from '../../types/index.ts';

export type AlertMetricType = AlertRule['metricType'];
export type AlertOperator = AlertRule['operator'];
export type AlertStatusFilter = 'all' | 'enabled' | 'disabled';

export interface AlertRuleFormData {
  name: string;
  metricType: AlertMetricType;
  threshold: number;
  operator: AlertOperator;
  enabled: boolean;
  notifyEmail: boolean;
  notifyWechat: boolean;
  cooldownMinutes: number;
}

const operatorLabels: Record<AlertOperator, string> = {
  '>': '大于',
  '<': '小于',
  '>=': '大于等于',
  '<=': '小于等于',
};

export const alertMetricOptions = ALERT_METRIC_TYPES.map((value) => ({
  value,
  ...ALERT_METRIC_DEFINITIONS[value],
}));

export const alertOperatorOptions = ALERT_OPERATORS.map((value) => ({
  value,
  label: operatorLabels[value],
}));

export function createEmptyAlertRuleForm(): AlertRuleFormData {
  return {
    name: '',
    metricType: 'traffic_down',
    threshold: 0,
    operator: '>',
    enabled: true,
    notifyEmail: true,
    notifyWechat: true,
    cooldownMinutes: 30,
  };
}

export function toAlertRuleForm(rule: AlertRule): AlertRuleFormData {
  return {
    name: rule.name,
    metricType: rule.metricType,
    threshold: rule.threshold,
    operator: rule.operator,
    enabled: rule.enabled,
    notifyEmail: rule.notifyEmail,
    notifyWechat: rule.notifyWechat,
    cooldownMinutes: rule.cooldownMinutes,
  };
}

export function getAlertMetricLabel(type: string): string {
  return alertMetricOptions.find((item) => item.value === type)?.label || type;
}

export function getAlertMetricUnit(type: string): string {
  return alertMetricOptions.find((item) => item.value === type)?.unit || '';
}

export function getAlertMetricHint(type: string): string {
  return alertMetricOptions.find((item) => item.value === type)?.hint || '';
}

export function getAlertOperatorLabel(operator: string): string {
  return alertOperatorOptions.find((item) => item.value === operator)?.label || operator;
}

export function filterAlertRules(
  rules: AlertRule[],
  query: string,
  status: AlertStatusFilter,
): AlertRule[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return rules.filter((rule) => {
    const matchesQuery = !normalizedQuery || [
      rule.name,
      getAlertMetricLabel(rule.metricType),
      getAlertMetricUnit(rule.metricType),
    ].join(' ').toLocaleLowerCase().includes(normalizedQuery);
    const matchesStatus = status === 'all'
      || (status === 'enabled' ? rule.enabled : !rule.enabled);
    return matchesQuery && matchesStatus;
  });
}

export function getAlertRuleStats(rules: AlertRule[]) {
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  return {
    enabledCount,
    disabledCount: rules.length - enabledCount,
    emailCount: rules.filter((rule) => rule.notifyEmail).length,
    wechatCount: rules.filter((rule) => rule.notifyWechat).length,
    metricDistribution: alertMetricOptions.map((metric) => (
      rules.filter((rule) => rule.metricType === metric.value).length
    )),
  };
}
