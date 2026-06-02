import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getOrCreateCpeClient();
    await client.ensureLogin();
    const onlineState = await client.getOnlineState();

    return NextResponse.json({
      updateState: onlineState?.UpdateState || onlineState?.upgState || 'unknown',
      connectionStatus: onlineState?.ConnectionStatus || 'unknown',
      raw: onlineState,
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    return NextResponse.json({ error: error.message || '获取升级状态失败' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getOrCreateCpeClient();
    await client.ensureLogin();
    const result = await client.checkOnlineUpgrade();
    const onlineState = await client.getOnlineState().catch(() => null);

    return NextResponse.json({
      success: true,
      message: '已触发系统更新检查',
      result,
      updateState: onlineState?.UpdateState || onlineState?.upgState || 'unknown',
    });
  } catch (error: any) {
    console.error('Update check error:', error);
    return NextResponse.json({ error: error.message || '检查更新失败' }, { status: 500 });
  }
}
