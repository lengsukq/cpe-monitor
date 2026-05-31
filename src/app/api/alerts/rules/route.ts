import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';

let dbInitialized = false;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const rules = db.prepare('SELECT * FROM alert_rules ORDER BY created_at').all();
    return NextResponse.json(rules);
  } catch (error) {
    return NextResponse.json({ error: '获取告警规则失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const body = await request.json();

    db.prepare('INSERT INTO alert_rules (name, metric_type, threshold, operator, enabled, notify_email, notify_wechat, cooldown_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(body.name, body.metricType, body.threshold, body.operator, body.enabled ? 1 : 0, body.notifyEmail ? 1 : 0, body.notifyWechat ? 1 : 0, body.cooldownMinutes || 30);

    const newRule = db.prepare('SELECT * FROM alert_rules ORDER BY id DESC LIMIT 1').get();
    return NextResponse.json(newRule);
  } catch (error) {
    return NextResponse.json({ error: '创建告警规则失败' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const body = await request.json();
    const { id, ...d } = body;

    db.prepare('UPDATE alert_rules SET name=?, metric_type=?, threshold=?, operator=?, enabled=?, notify_email=?, notify_wechat=?, cooldown_minutes=? WHERE id=?')
      .run(d.name, d.metricType, d.threshold, d.operator, d.enabled ? 1 : 0, d.notifyEmail ? 1 : 0, d.notifyWechat ? 1 : 0, d.cooldownMinutes, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '更新告警规则失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: '缺少规则ID' }, { status: 400 });

    db.prepare('DELETE FROM alert_rules WHERE id = ?').run(parseInt(id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '删除告警规则失败' }, { status: 500 });
  }
}
