import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getOrCreateCpeClient();
    await client.ensureLogin();

    const [deviceInfo, onlineState, deviceInformation] = await Promise.all([
      client.getDeviceInfo(),
      client.getOnlineState(),
      client.getDeviceInformation(),
    ]);

    return NextResponse.json({ deviceInfo, onlineState, deviceInformation });
  } catch (error: any) {
    console.error('Device info error:', error);
    return NextResponse.json({ error: error.message || '获取设备信息失败' }, { status: 500 });
  }
}
