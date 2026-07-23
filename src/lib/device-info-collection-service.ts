import { getOrCreateCpeClient } from '@/lib/cpe-client';
import {
  buildDeviceInfoSnapshotFields,
  persistDeviceInfoSnapshot,
} from '@/lib/repositories/device-info-repository';
import { isCpeConfigured } from '@/lib/settings-store';
import type {
  CpeDevicePageResponse,
  CpeNetworkSnapshot,
} from '@/types/cpe';

export interface DeviceInfoCollectionResult {
  success: boolean;
  snapshotId: number | null;
  collectedAt: string | null;
  deviceName: string | null;
  error?: string;
}

function getCollectionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '设备信息采集失败';
}

async function safeOptionalNetworkSnapshot(
  task: () => Promise<CpeNetworkSnapshot>,
): Promise<CpeNetworkSnapshot | null> {
  try {
    return await task();
  } catch (error) {
    console.error('Optional network snapshot failed during device info collection', error);
    return null;
  }
}

export async function collectDeviceInfo(
  source: 'scheduler' | 'manual' = 'scheduler',
): Promise<DeviceInfoCollectionResult> {
  if (!isCpeConfigured()) {
    return {
      success: false,
      snapshotId: null,
      collectedAt: null,
      deviceName: null,
      error: 'CPE 未配置',
    };
  }

  try {
    const client = getOrCreateCpeClient();
    await client.ensureLogin();

    // Identity endpoints first; network snapshot is optional so a transient
    // radio-API failure does not block long-term device identity storage.
    const [deviceInformation, deviceInfo, onlineState] = await Promise.all([
      client.getDeviceInformation(),
      client.getDeviceInfo(),
      client.getOnlineState(),
    ]);
    const networkSnapshot = await safeOptionalNetworkSnapshot(() => client.getNetworkSnapshot());

    if (!deviceInformation.DeviceName && !deviceInformation.Imei && !deviceInformation.SerialNumber) {
      throw new Error('CPE 未返回有效设备身份信息');
    }

    const payload: CpeDevicePageResponse = {
      deviceInformation,
      deviceInfo,
      onlineState,
      cellInformation: networkSnapshot || undefined,
    };
    const fields = buildDeviceInfoSnapshotFields({
      deviceInformation,
      deviceInfo,
      onlineState,
      networkSnapshot,
    });
    const collectedAt = new Date();
    const { snapshotId } = persistDeviceInfoSnapshot({
      source,
      fields,
      payload,
      collectedAt,
    });

    return {
      success: true,
      snapshotId,
      collectedAt: collectedAt.toISOString(),
      deviceName: fields.deviceName,
    };
  } catch (error) {
    console.error('Failed to collect device info', error);
    return {
      success: false,
      snapshotId: null,
      collectedAt: null,
      deviceName: null,
      error: getCollectionErrorMessage(error),
    };
  }
}
