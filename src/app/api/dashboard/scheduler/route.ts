import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';
import { startScheduler, stopScheduler, getSchedulerStatus } from '@/lib/scheduler';

let dbInitialized = false;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const settings = db.prepare('SELECT * FROM system_settings').all() as any[];
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    return NextResponse.json({
      enabled: settingsMap['scheduler_enabled'] === 'true',
      interval: parseInt(settingsMap['scheduler_interval'] || '60'),
      running: getSchedulerStatus().running,
    });
  } catch (error) {
    return NextResponse.json({ error: '获取调度状态失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const { enabled, interval } = await request.json();

    db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run('scheduler_enabled', String(enabled));

    if (interval) {
      db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run('scheduler_interval', String(interval));
    }

    if (enabled) {
      await startScheduler();
    } else {
      stopScheduler();
    }

    return NextResponse.json({
      success: true,
      status: { enabled: Boolean(enabled), interval: Number(interval || 60), running: getSchedulerStatus().running },
    });
  } catch (error) {
    console.error('Scheduler update error:', error);
    return NextResponse.json({ error: '更新调度设置失败' }, { status: 500 });
  }
}
