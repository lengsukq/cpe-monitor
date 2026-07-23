/**
 * Device Info Sync Scheduler — manages periodic CPE device information collection.
 *
 * Extracted from scheduler.ts to enforce Single Responsibility Principle.
 */
import { initializeDatabase } from './db';
import { getSettingsMap, setSetting } from './settings-store';
import { getErrorMessage } from './error-utils';
import {
  collectDeviceInfo,
  type DeviceInfoCollectionResult,
} from './device-info-collection-service';

export const DEVICE_INFO_SYNC_MIN_INTERVAL = 30;
export const DEVICE_INFO_SYNC_MAX_INTERVAL = 10080;
export const DEVICE_INFO_SYNC_DEFAULT_INTERVAL = 360;

export interface DeviceInfoSyncStatus {
  enabled: boolean;
  interval: number;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

let deviceInfoSyncTask: ReturnType<typeof setInterval> | null = null;
let deviceInfoSyncPromise: Promise<DeviceInfoCollectionResult> | null = null;

function getDeviceInfoSyncInterval(value: string | undefined): number {
  const interval = Number(value || DEVICE_INFO_SYNC_DEFAULT_INTERVAL);
  if (!Number.isInteger(interval)) return DEVICE_INFO_SYNC_DEFAULT_INTERVAL;
  return Math.min(
    DEVICE_INFO_SYNC_MAX_INTERVAL,
    Math.max(DEVICE_INFO_SYNC_MIN_INTERVAL, interval),
  );
}

function updateDeviceInfoSyncMetadata(lastSyncedAt: string | null, lastError: string | null): void {
  if (lastSyncedAt !== null) setSetting('device_info_last_sync_at', lastSyncedAt);
  if (lastError !== null) setSetting('device_info_last_sync_error', lastError);
}

export function getDeviceInfoSyncStatus(): DeviceInfoSyncStatus {
  initializeDatabase();
  const settings = getSettingsMap();
  return {
    enabled: settings.device_info_sync_enabled !== 'false',
    interval: getDeviceInfoSyncInterval(settings.device_info_sync_interval),
    running: deviceInfoSyncTask !== null,
    lastSyncedAt: settings.device_info_last_sync_at || null,
    lastError: settings.device_info_last_sync_error || null,
  };
}

export function isValidDeviceInfoSyncInterval(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= DEVICE_INFO_SYNC_MIN_INTERVAL
    && value <= DEVICE_INFO_SYNC_MAX_INTERVAL;
}

export async function restartDeviceInfoScheduler(): Promise<DeviceInfoSyncStatus> {
  initializeDatabase();
  stopDeviceInfoScheduler();

  const status = getDeviceInfoSyncStatus();
  if (!status.enabled) {
    console.log('Device info sync scheduler is disabled');
    return status;
  }

  deviceInfoSyncTask = setInterval(() => {
    void runScheduledDeviceInfoSync();
  }, status.interval * 60 * 1000);

  console.log(`Device info sync scheduler started with interval: ${status.interval} minutes`);
  void runScheduledDeviceInfoSync();
  return getDeviceInfoSyncStatus();
}

export function stopDeviceInfoScheduler(): void {
  if (deviceInfoSyncTask) {
    clearInterval(deviceInfoSyncTask);
    deviceInfoSyncTask = null;
  }
}

export async function ensureDeviceInfoSchedulerStarted(): Promise<void> {
  const status = getDeviceInfoSyncStatus();
  if (status.enabled && !status.running) {
    await restartDeviceInfoScheduler();
  } else if (!status.enabled && status.running) {
    stopDeviceInfoScheduler();
  }
}

export async function syncDeviceInfo(
  source: 'scheduler' | 'manual' = 'scheduler',
): Promise<DeviceInfoCollectionResult> {
  if (deviceInfoSyncPromise) return deviceInfoSyncPromise;

  const task = performDeviceInfoSync(source);
  deviceInfoSyncPromise = task;
  try {
    return await task;
  } finally {
    if (deviceInfoSyncPromise === task) deviceInfoSyncPromise = null;
  }
}

async function runScheduledDeviceInfoSync(): Promise<void> {
  try {
    await syncDeviceInfo('scheduler');
  } catch (error) {
    console.error('Failed to sync device info:', error);
  }
}

async function performDeviceInfoSync(
  source: 'scheduler' | 'manual',
): Promise<DeviceInfoCollectionResult> {
  try {
    initializeDatabase();
    const result = await collectDeviceInfo(source);
    if (result.success) {
      updateDeviceInfoSyncMetadata(result.collectedAt || new Date().toISOString(), '');
      console.log(
        `Device info sync completed${result.deviceName ? `: ${result.deviceName}` : ''}`,
      );
    } else {
      updateDeviceInfoSyncMetadata(null, result.error || '设备信息同步失败');
    }
    return result;
  } catch (error) {
    updateDeviceInfoSyncMetadata(null, getErrorMessage(error, '设备信息同步失败'));
    throw error;
  }
}
