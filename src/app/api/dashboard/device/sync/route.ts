import {
  ensureDatabase,
  jsonOk,
  requireSession,
  withApiHandler,
  ApiError,
} from '@/lib/api-route';
import {
  ensureSchedulerStarted,
  getDeviceInfoSyncStatus,
  syncDeviceInfo,
} from '@/lib/scheduler';

export const POST = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  await ensureSchedulerStarted();

  const result = await syncDeviceInfo('manual');
  if (!result.success) {
    throw new ApiError(result.error || '设备信息同步失败', 502);
  }

  return jsonOk({
    success: true,
    result,
    sync: getDeviceInfoSyncStatus(),
  });
}, '手动同步设备信息失败');
