import { db, ensureDatabaseReady } from '@/lib/db';

interface SmsMessageRow {
  id: string;
  phone: string;
  content: string;
  date: string | null;
  unread: number | boolean;
  direction: string;
}

export interface StoredSmsMessage {
  id: string;
  phone: string;
  content: string;
  date: string | null;
  unread: boolean;
  direction: 'inbound' | 'outbound';
}

export function getStoredSmsSnapshot(): {
  messages: StoredSmsMessage[];
  total: number;
  unread: number;
} {
  ensureDatabaseReady();
  const rows = db.prepare(`
    SELECT COALESCE(NULLIF(message_id, ''), fingerprint) AS id,
           phone, content, received_at AS date, unread, direction
    FROM sms_messages
    ORDER BY received_at DESC, created_at DESC
  `).all() as SmsMessageRow[];
  const totals = db.prepare(`
    SELECT COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN unread = 1 THEN 1 ELSE 0 END), 0) AS unread
    FROM sms_messages
  `).get() as { total: number; unread: number };
  return {
    messages: rows.map((row) => ({
      ...row,
      unread: Boolean(row.unread),
      direction: row.direction === 'outbound' ? 'outbound' : 'inbound',
    })),
    total: totals.total || 0,
    unread: totals.unread || 0,
  };
}
