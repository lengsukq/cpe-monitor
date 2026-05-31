import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getOrCreateCpeClient();
    await client.ensureLogin();
    const startDate = await client.getStartDate();

    return NextResponse.json(startDate);
  } catch (error: any) {
    console.error('Start date error:', error);
    return NextResponse.json({ error: error.message || '获取套餐配置失败' }, { status: 500 });
  }
}
