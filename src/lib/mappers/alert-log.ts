import type { AlertLog } from '@/types';

function parseSqliteDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (value.includes('T')) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(`${value.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface AlertLogRow {
  id: number;
  rule_id: number | null;
  triggered_at: string | null;
  message: string | null;
  notified: number | boolean | null;
  rule_name?: string | null;
}

export interface AlertLogWithRuleName extends AlertLog {
  ruleName: string | null;
}

function toBoolean(value: number | boolean | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  return value === true || value === 1;
}

export function mapAlertLogRow(row: AlertLogRow): AlertLogWithRuleName {
  return {
    id: row.id,
    ruleId: row.rule_id,
    triggeredAt: parseSqliteDateTime(row.triggered_at),
    message: row.message,
    notified: toBoolean(row.notified),
    ruleName: row.rule_name ?? null,
  };
}

export function mapAlertLogRows(rows: AlertLogRow[]): AlertLogWithRuleName[] {
  return rows.map(mapAlertLogRow);
}
