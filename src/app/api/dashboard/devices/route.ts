import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getOrCreateCpeClient();
    await client.ensureLogin();
    const allDevices = await client.getRawHostInfo();
    const devices = allDevices.filter((device: any) => device.Active);

    return NextResponse.json({ devices, total: allDevices.length });
  } catch (error: any) {
    console.error('Devices list error:', error);
    return NextResponse.json({ error: error.message || '获取设备列表失败' }, { status: 500 });
  }
}
