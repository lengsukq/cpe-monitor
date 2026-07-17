import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';
import { ensureSchedulerStarted, getSmsSyncStatus } from '@/lib/scheduler';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    initializeDatabase();
    // Start the persisted background schedule when this is the first authenticated page hit,
    // but keep this read endpoint independent from CPE availability.
    await ensureSchedulerStarted();

    const messages = db.prepare(`
      SELECT
        COALESCE(NULLIF(message_id, ''), fingerprint) AS id,
        phone,
        content,
        received_at AS date,
        unread,
        direction
      FROM sms_messages
      ORDER BY received_at DESC, created_at DESC
    `).all().map((message: any) => ({
      ...message,
      unread: Boolean(message.unread),
      direction: message.direction === 'outbound' ? 'outbound' : 'inbound',
    }));
    const totals = db.prepare(`
      SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN unread = 1 THEN 1 ELSE 0 END), 0) AS unread
      FROM sms_messages
    `).get() as { total: number; unread: number };

    return NextResponse.json({
      messages,
      total: totals.total || 0,
      unread: totals.unread || 0,
      readOnly: true,
      sync: getSmsSyncStatus(),
    });
  } catch (error) {
    console.error('SMS dashboard error:', error);
    return NextResponse.json({ error: '获取本地短信失败' }, { status: 500 });
  }
}
