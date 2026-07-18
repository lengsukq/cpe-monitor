import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

async function safeOptional<T>(label: string, task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch (error) {
    console.error(`Optional CPE field failed: ${label}`, error);
    return fallback;
  }
}

export const GET = withApiHandler(async () => {
  await requireSession();

  const client = getOrCreateCpeClient();
  await client.ensureLogin();

  // Identity endpoints are critical to this page. Fetch them first so a
  // transient CPE token/session response cannot silently turn all IDs into '-'.
  const [deviceInfo, onlineState, deviceInformation, cellInformation] = await Promise.all([
    client.getDeviceInfo(),
    client.getOnlineState(),
    client.getDeviceInformation(),
    client.getCellInformation(),
  ]);

  const [topology, devCapacity, wlanDbho, vendorName, portalSettings, iocDeviceCapacity] = await Promise.all([
    safeOptional('topology', () => client.getTopology(), {}),
    safeOptional('devCapacity', () => client.getDevCapacity(), {}),
    safeOptional('wlanDbho', () => client.getWlanDbho(), null),
    safeOptional('vendorName', () => client.getVendorName(), null),
    safeOptional('portalSettings', () => client.getPortalSettings(), null),
    safeOptional('iocDeviceCapacity', () => client.getIocDeviceCapacity(), null),
  ]);

  return jsonOk({
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
}, '获取设备信息失败');
