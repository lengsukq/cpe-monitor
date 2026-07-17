import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const client = getOrCreateCpeClient();
    await client.ensureLogin();

    const safe = async <T>(task: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await task(); } catch { return fallback; }
    };

    // Identity endpoints are critical to this page. Fetch them first so a
    // transient CPE token/session response cannot silently turn all IDs into '-'.
    const [deviceInfo, onlineState, deviceInformation, cellInformation] = await Promise.all([
      client.getDeviceInfo(),
      client.getOnlineState(),
      client.getDeviceInformation(),
      client.getCellInformation(),
    ]);

    const [topology, devCapacity, wlanDbho, vendorName, portalSettings, iocDeviceCapacity] = await Promise.all([
      safe(() => client.getTopology(), {}),
      safe(() => client.getDevCapacity(), {}),
      safe(() => client.getWlanDbho(), null),
      safe(() => client.getVendorName(), null),
      safe(() => client.getPortalSettings(), null),
      safe(() => client.getIocDeviceCapacity(), null),
    ]);

    return NextResponse.json({
      deviceInfo,
      onlineState,
      deviceInformation,
      cellInformation,
      topology,
      devCapacity,
      wlanDbho,
      vendorName,
      portalSettings,
      iocDeviceCapacity,
    });
  } catch (error: any) {
    console.error('Device info error:', error);
    return NextResponse.json({ error: error.message || '获取设备信息失败' }, { status: 500 });
  }
}
