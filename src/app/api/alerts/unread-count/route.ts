import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { db, ensureDatabaseReady } from '@/lib/db';

export const GET = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabaseReady();

  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');

  let count: number;
  if (since) {
    const row = db.prepare(
      `SELECT COUNT(*) AS count FROM alert_logs WHERE triggered_at > ?`,
    ).get(since) as { count: number };
    count = row.count;
  } else {
    // Default: alerts from today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const row = db.prepare(
      `SELECT COUNT(*) AS count FROM alert_logs WHERE triggered_at >= ?`,
    ).get(todayStart.toISOString()) as { count: number };
    count = row.count;
  }

  return jsonOk({ count });
}, '获取未读告警数失败');
