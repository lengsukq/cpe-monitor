import {
  ensureDatabase,
  jsonOk,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { getOrCreateCpeClient } from '@/lib/cpe-client';
import {
  findLatestDeviceInfoProfile,
  parseDeviceInfoPayload,
} from '@/lib/repositories/device-info-repository';
import type { CpeDevicePageResponse } from '@/types/cpe';

async function safeOptional<T>(label: string, task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch (error) {
    console.error(`Optional CPE field failed: ${label}`, error);
    return fallback;
  }
}

function getCachedDevicePage(): {
  payload: CpeDevicePageResponse;
  updatedAt: string;
  source: string;
} | null {
  const profile = findLatestDeviceInfoProfile();
  if (!profile) return null;
  const payload = parseDeviceInfoPayload(profile.payloadJson);
  if (!payload?.deviceInformation) return null;
  return {
    payload,
    updatedAt: profile.updatedAt,
    source: profile.source,
  };
}

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();

  try {
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
      source: 'cpe' as const,
      cpeError: '',
      cachedAt: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取设备信息失败';
    console.error('Live device page failed, trying cached profile', error);
    const cached = getCachedDevicePage();
    if (!cached) {
      throw error;
    }

    return jsonOk({
      ...cached.payload,
      source: 'database' as const,
      cpeError: message,
      cachedAt: cached.updatedAt,
    });
  }
}, '获取设备信息失败');
