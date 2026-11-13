import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { getAppDayRange, parseDateTime, toSqliteTimestamp } from '@/lib/date-time';
import { db, ensureDatabaseReady } from '@/lib/db';

export const GET = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabaseReady();

  const { searchParams } = new URL(request.url);
  const since = searchParams.get('since');

  let count: number;
  const parsedSince = parseDateTime(since);
  if (parsedSince) {
    const row = db.prepare(
      'SELECT COUNT(*) AS count FROM alert_logs WHERE triggered_at > ?',
    ).get(toSqliteTimestamp(parsedSince)) as { count: number };
    count = row.count;
  } else {
    // Default: alerts from today in Asia/Shanghai
    const { start } = getAppDayRange(new Date());
    const row = db.prepare(
      'SELECT COUNT(*) AS count FROM alert_logs WHERE triggered_at >= ?',
    ).get(toSqliteTimestamp(start)) as { count: number };
    count = row.count;
  }

  return jsonOk({ count });
}, '获取未读告警数失败');
