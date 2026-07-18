import type { AlertRule } from '@/types';

function parseSqliteDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (value.includes('T')) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface AlertRuleRow {
  id: number;
  name: string;
  metric_type: string;
  threshold: number;
  operator: string;
  enabled: number | boolean | null;
  notify_email: number | boolean | null;
  notify_wechat: number | boolean | null;
  cooldown_minutes: number | null;
  created_at: string | null;
}

function toBoolean(value: number | boolean | null | undefined): boolean {
  return value === true || value === 1;
}

export function mapAlertRuleRow(row: AlertRuleRow): AlertRule {
  return {
    id: row.id,
    name: row.name,
    metricType: row.metric_type as AlertRule['metricType'],
    threshold: row.threshold,
    operator: row.operator as AlertRule['operator'],
    enabled: toBoolean(row.enabled),
    notifyEmail: toBoolean(row.notify_email),
    notifyWechat: toBoolean(row.notify_wechat),
    cooldownMinutes: row.cooldown_minutes ?? 30,
    createdAt: parseSqliteDateTime(row.created_at),
  };
}

export function mapAlertRuleRows(rows: AlertRuleRow[]): AlertRule[] {
  return rows.map(mapAlertRuleRow);
}
