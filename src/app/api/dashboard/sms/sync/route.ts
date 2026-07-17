import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { initializeDatabase } from '@/lib/db';
import { ensureSchedulerStarted, getSmsSyncStatus, syncSmsMessages } from '@/lib/scheduler';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    initializeDatabase();
    await ensureSchedulerStarted();
    const result = await syncSmsMessages();

    return NextResponse.json({ success: true, result, sync: getSmsSyncStatus() });
  } catch (error) {
    console.error('Manual SMS sync error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : '短信同步失败',
    }, { status: 502 });
  }
}
