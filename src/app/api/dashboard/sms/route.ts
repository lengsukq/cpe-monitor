import { db } from '@/lib/db';
import { ensureDatabase, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { ensureSchedulerStarted, getSmsSyncStatus } from '@/lib/scheduler';

interface SmsMessageRow {
  id: string;
  phone: string;
  content: string;
  date: string | null;
  unread: number | boolean;
  direction: string;
}

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  // Start the persisted background schedule when this is the first authenticated page hit,
  // but keep this read endpoint independent from CPE availability.
  await ensureSchedulerStarted();

  const messages = (db.prepare(`
    SELECT
      COALESCE(NULLIF(message_id, ''), fingerprint) AS id,
      phone,
      content,
      received_at AS date,
      unread,
      direction
    FROM sms_messages
    ORDER BY received_at DESC, created_at DESC
  `).all() as SmsMessageRow[]).map((message) => ({
    ...message,
    unread: Boolean(message.unread),
    direction: message.direction === 'outbound' ? 'outbound' : 'inbound',
  }));

  const totals = db.prepare(`
    SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN unread = 1 THEN 1 ELSE 0 END), 0) AS unread
    FROM sms_messages
  `).get() as { total: number; unread: number };

  return jsonOk({
    messages,
    total: totals.total || 0,
    unread: totals.unread || 0,
    readOnly: true,
    sync: getSmsSyncStatus(),
  });
}, '获取本地短信失败');
