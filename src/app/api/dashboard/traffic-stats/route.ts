import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getOrCreateCpeClient();
    await client.ensureLogin();
    const [stats, monthStatistics] = await Promise.all([
      client.getTrafficStatistics(),
      client.getMonthStatistics(),
    ]);

    return NextResponse.json({ ...stats, ...monthStatistics });
  } catch (error: any) {
    console.error('Traffic stats error:', error);
    return NextResponse.json({ error: error.message || '获取流量统计失败' }, { status: 500 });
  }
}
