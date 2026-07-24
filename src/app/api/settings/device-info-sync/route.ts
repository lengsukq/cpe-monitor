import { createSyncSettingsRoute } from '@/lib/sync-route-factory';
import {
  DEVICE_INFO_SYNC_MAX_INTERVAL,
  DEVICE_INFO_SYNC_MIN_INTERVAL,
  getDeviceInfoSyncStatus,
  isValidDeviceInfoSyncInterval,
  restartDeviceInfoScheduler,
} from '@/lib/scheduler';

export const { GET, POST } = createSyncSettingsRoute({
  enabledKey: 'device_info_sync_enabled',
  intervalKey: 'device_info_sync_interval',
  minInterval: DEVICE_INFO_SYNC_MIN_INTERVAL,
  maxInterval: DEVICE_INFO_SYNC_MAX_INTERVAL,
  getStatus: getDeviceInfoSyncStatus,
  isValidInterval: isValidDeviceInfoSyncInterval,
  restart: restartDeviceInfoScheduler,
  getErrorMessage: '获取设备信息同步设置失败',
  postErrorMessage: '保存设备信息同步设置失败',
});
