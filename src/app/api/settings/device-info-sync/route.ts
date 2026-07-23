import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import {
  DEVICE_INFO_SYNC_MAX_INTERVAL,
  DEVICE_INFO_SYNC_MIN_INTERVAL,
  ensureSchedulerStarted,
  getDeviceInfoSyncStatus,
  isValidDeviceInfoSyncInterval,
  restartDeviceInfoScheduler,
} from '@/lib/scheduler';
import { setSetting } from '@/lib/settings-store';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  await ensureSchedulerStarted();
  return jsonOk(getDeviceInfoSyncStatus());
}, '获取设备信息同步设置失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  const body = await parseJsonBody<{ enabled?: boolean; interval?: number }>(request);
  if (typeof body.enabled !== 'boolean' || !isValidDeviceInfoSyncInterval(body.interval)) {
    throw new ApiError(
      `同步间隔必须是 ${DEVICE_INFO_SYNC_MIN_INTERVAL} 到 ${DEVICE_INFO_SYNC_MAX_INTERVAL} 之间的整数分钟`,
      400,
    );
  }

  ensureDatabase();
  setSetting('device_info_sync_enabled', String(body.enabled));
  setSetting('device_info_sync_interval', String(body.interval));

  const sync = await restartDeviceInfoScheduler();
  return jsonOk({ success: true, sync });
}, '保存设备信息同步设置失败');
