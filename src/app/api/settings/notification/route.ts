import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';

let dbInitialized = false;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const configs = db.prepare('SELECT * FROM notification_config').all();
    return NextResponse.json(configs);
  } catch (error) {
    return NextResponse.json({ error: '获取通知配置失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const { type, config, enabled } = await request.json();
    if (!type || !config || !['email', 'wechat'].includes(type)) {
      return NextResponse.json({ error: '通知配置格式不正确' }, { status: 400 });
    }
    const serializedConfig = typeof config === 'string' ? config : JSON.stringify(config);
    const existing = db.prepare('SELECT * FROM notification_config WHERE type = ?').get(type) as any;

    if (existing) {
      db.prepare('UPDATE notification_config SET config = ?, enabled = ?, updated_at = datetime("now") WHERE id = ?')
        .run(serializedConfig, enabled !== undefined ? (enabled ? 1 : 0) : 1, existing.id);
    } else {
      db.prepare('INSERT INTO notification_config (type, config, enabled) VALUES (?, ?, ?)')
        .run(type, serializedConfig, enabled !== undefined ? (enabled ? 1 : 0) : 1);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '保存通知配置失败' }, { status: 500 });
  }
}
