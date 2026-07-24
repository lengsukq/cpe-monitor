/**
 * Device Info Sync Scheduler — manages periodic CPE device information collection.
 *
 * Uses the generic IntervalScheduler factory for scheduling lifecycle;
 * this module only contains device-info-specific business logic.
 */
import { initializeDatabase } from './db';
import {
  collectDeviceInfo,
  type DeviceInfoCollectionResult,
} from './device-info-collection-service';
import { createIntervalScheduler, type SyncStatus } from './interval-scheduler';

export const DEVICE_INFO_SYNC_MIN_INTERVAL = 30;
export const DEVICE_INFO_SYNC_MAX_INTERVAL = 10080;
export const DEVICE_INFO_SYNC_DEFAULT_INTERVAL = 360;

export type DeviceInfoSyncStatus = SyncStatus;

const scheduler = createIntervalScheduler({
  name: 'Device info sync',
  settingPrefix: 'device_info',
  defaultInterval: DEVICE_INFO_SYNC_DEFAULT_INTERVAL,
  minInterval: DEVICE_INFO_SYNC_MIN_INTERVAL,
  maxInterval: DEVICE_INFO_SYNC_MAX_INTERVAL,
  task: (source) => performDeviceInfoSync(source),
});

export function getDeviceInfoSyncStatus(): DeviceInfoSyncStatus {
  return scheduler.getStatus();
}

export function isValidDeviceInfoSyncInterval(value: unknown): value is number {
  return scheduler.isValidInterval(value);
}

export async function restartDeviceInfoScheduler(): Promise<DeviceInfoSyncStatus> {
  return scheduler.restart();
}

export function stopDeviceInfoScheduler(): void {
  scheduler.stop();
}

export async function ensureDeviceInfoSchedulerStarted(): Promise<void> {
  return scheduler.ensureStarted();
}

export async function syncDeviceInfo(
  source: 'scheduler' | 'manual' = 'scheduler',
): Promise<DeviceInfoCollectionResult> {
  return scheduler.sync(source) as Promise<DeviceInfoCollectionResult>;
}

// ─── Business Logic ────────────────────────────────────────────────────────

async function performDeviceInfoSync(
  source: 'scheduler' | 'manual',
): Promise<DeviceInfoCollectionResult> {
  initializeDatabase();
  const result = await collectDeviceInfo(source);
  if (result.success) {
    console.log(
      `Device info sync completed${result.deviceName ? `: ${result.deviceName}` : ''}`,
    );
  } else {
    throw new Error(result.error || '设备信息同步失败');
  }
  return result;
}
