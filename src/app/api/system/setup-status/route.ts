import { jsonOk, requireSession, withApiHandler, parseJsonBody } from '@/lib/api-route';
import { db, ensureDatabaseReady } from '@/lib/db';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabaseReady();

  const row = db.prepare(
    "SELECT value FROM system_settings WHERE key = 'setup_completed'",
  ).get() as { value: string } | undefined;

  return jsonOk({ completed: row?.value === 'true' });
}, '获取设置状态失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabaseReady();

  const body = await parseJsonBody<{ completed?: boolean }>(request);
  const value = body.completed !== false ? 'true' : 'false';

  db.prepare(
    `INSERT INTO system_settings (key, value) VALUES ('setup_completed', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(value);

  return jsonOk({ completed: value === 'true' });
}, '更新设置状态失败');
