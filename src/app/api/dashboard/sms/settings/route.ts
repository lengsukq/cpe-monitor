import { createSyncSettingsRoute } from '@/lib/sync-route-factory';
import {
  getSmsSyncStatus,
  isValidSmsSyncInterval,
  restartSmsScheduler,
  SMS_SYNC_MAX_INTERVAL,
  SMS_SYNC_MIN_INTERVAL,
} from '@/lib/scheduler';

export const { GET, POST } = createSyncSettingsRoute({
  enabledKey: 'sms_sync_enabled',
  intervalKey: 'sms_sync_interval',
  minInterval: SMS_SYNC_MIN_INTERVAL,
  maxInterval: SMS_SYNC_MAX_INTERVAL,
  getStatus: getSmsSyncStatus,
  isValidInterval: isValidSmsSyncInterval,
  restart: restartSmsScheduler,
  getErrorMessage: '获取短信同步设置失败',
  postErrorMessage: '保存短信同步设置失败',
});
