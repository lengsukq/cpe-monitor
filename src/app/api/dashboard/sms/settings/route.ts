import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';
import {
  ensureSchedulerStarted,
  getSmsSyncStatus,
  isValidSmsSyncInterval,
  restartSmsScheduler,
  SMS_SYNC_MAX_INTERVAL,
  SMS_SYNC_MIN_INTERVAL,
} from '@/lib/scheduler';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    initializeDatabase();
    await ensureSchedulerStarted();
    return NextResponse.json(getSmsSyncStatus());
  } catch (error) {
    console.error('SMS sync settings error:', error);
    return NextResponse.json({ error: '获取短信同步设置失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { enabled, interval } = await request.json();
    if (typeof enabled !== 'boolean' || !isValidSmsSyncInterval(interval)) {
      return NextResponse.json({
        error: `同步间隔必须是 ${SMS_SYNC_MIN_INTERVAL} 到 ${SMS_SYNC_MAX_INTERVAL} 之间的整数分钟`,
      }, { status: 400 });
    }

    initializeDatabase();
    db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
      .run('sms_sync_enabled', String(enabled));
    db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)')
      .run('sms_sync_interval', String(interval));

    const sync = await restartSmsScheduler();
    return NextResponse.json({ success: true, sync });
  } catch (error) {
    console.error('SMS sync settings update error:', error);
    return NextResponse.json({ error: '保存短信同步设置失败' }, { status: 500 });
  }
}
