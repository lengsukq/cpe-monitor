import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export const GET = withApiHandler(async () => {
  await requireSession();
  const client = getOrCreateCpeClient();
  await client.ensureLogin();
  const allDevices = await client.getRawHostInfo();
  const devices = allDevices.filter((device: { Active?: boolean }) => device.Active);
  return jsonOk({ devices, total: allDevices.length });
}, '获取设备列表失败');
