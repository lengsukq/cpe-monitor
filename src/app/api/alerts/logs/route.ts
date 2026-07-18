import { db } from '@/lib/db';
import { ensureDatabase, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { mapAlertLogRows, type AlertLogRow } from '@/lib/mappers/alert-log';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();

  const logs = db.prepare(`
    SELECT al.id, al.rule_id, al.triggered_at, al.message, al.notified, ar.name as rule_name
    FROM alert_logs al LEFT JOIN alert_rules ar ON al.rule_id = ar.id
    ORDER BY al.triggered_at DESC LIMIT 100
  `).all() as AlertLogRow[];

  return jsonOk(mapAlertLogRows(logs));
}, '获取告警日志失败');
