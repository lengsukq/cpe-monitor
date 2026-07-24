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

export function getStoredSmsPaginated(options: {
  page?: number;
  pageSize?: number;
  filter?: 'all' | 'unread' | 'read';
  direction?: 'all' | 'inbound' | 'outbound';
  keyword?: string;
}): {
  messages: StoredSmsMessage[];
  total: number;
  unread: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
} {
  ensureDatabaseReady();
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 50));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (options.filter === 'unread') {
    conditions.push('unread = 1');
  } else if (options.filter === 'read') {
    conditions.push('unread = 0');
  }
  if (options.direction && options.direction !== 'all') {
    conditions.push('direction = ?');
    bindings.push(options.direction);
  }
  if (options.keyword) {
    conditions.push('(content LIKE ? OR phone LIKE ?)');
    bindings.push(`%${options.keyword}%`, `%${options.keyword}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRow = db.prepare(
    `SELECT COUNT(*) AS total FROM sms_messages ${whereClause}`,
  ).get(...bindings) as { total: number };

  const unreadRow = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN unread = 1 THEN 1 ELSE 0 END), 0) AS unread
    FROM sms_messages
  `).get() as { unread: number };

  const rows = db.prepare(`
    SELECT COALESCE(NULLIF(message_id, ''), fingerprint) AS id,
           phone, content, received_at AS date, unread, direction
    FROM sms_messages
    ${whereClause}
    ORDER BY received_at DESC, created_at DESC
    LIMIT ? OFFSET ?
  `).all(...bindings, pageSize, offset) as SmsMessageRow[];

  return {
    messages: rows.map((row) => ({
      ...row,
      unread: Boolean(row.unread),
      direction: row.direction === 'outbound' ? 'outbound' : 'inbound',
    })),
    total: countRow.total,
    unread: unreadRow.unread || 0,
    page,
    pageSize,
    hasMore: offset + rows.length < countRow.total,
  };
}
