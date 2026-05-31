import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';

let dbInitialized = false;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const logs = db.prepare(`
      SELECT al.id, al.rule_id, al.triggered_at, al.message, al.notified, ar.name as rule_name
      FROM alert_logs al LEFT JOIN alert_rules ar ON al.rule_id = ar.id
      ORDER BY al.triggered_at DESC LIMIT 100
    `).all();

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: '获取告警日志失败' }, { status: 500 });
  }
}
