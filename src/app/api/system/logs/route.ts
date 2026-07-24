import { jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { db, ensureDatabaseReady } from '@/lib/db';

export const GET = withApiHandler(async (request) => {
  await requireSession();
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get('pageSize')) || 50));
  const level = url.searchParams.get('level'); // 'info' | 'warn' | 'error' | null
  const offset = (page - 1) * pageSize;

  ensureDatabaseReady();

  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (level) {
    conditions.push('level = ?');
    bindings.push(level);
  }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(
    `SELECT COUNT(*) AS count FROM system_logs ${whereClause}`,
  ).get(...bindings) as { count: number };

  const rows = db.prepare(
    `SELECT id, level, message, created_at FROM system_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
  ).all(...bindings, pageSize, offset) as Array<{ id: number; level: string; message: string; created_at: string }>;

  return jsonOk({
    logs: rows.map((row) => ({
      id: row.id,
      level: row.level,
      message: row.message,
      createdAt: row.created_at,
    })),
    total: countRow.count,
    page,
    pageSize,
  });
}, '获取系统日志失败');
