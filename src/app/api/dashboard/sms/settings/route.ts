import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import {
  ensureSchedulerStarted,
  getSmsSyncStatus,
  isValidSmsSyncInterval,
  restartSmsScheduler,
  SMS_SYNC_MAX_INTERVAL,
  SMS_SYNC_MIN_INTERVAL,
} from '@/lib/scheduler';
import { setSetting } from '@/lib/settings-store';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  await ensureSchedulerStarted();
  return jsonOk(getSmsSyncStatus());
}, '获取短信同步设置失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  const body = await parseJsonBody<{ enabled?: boolean; interval?: number }>(request);
  if (typeof body.enabled !== 'boolean' || !isValidSmsSyncInterval(body.interval)) {
    throw new ApiError(
      `同步间隔必须是 ${SMS_SYNC_MIN_INTERVAL} 到 ${SMS_SYNC_MAX_INTERVAL} 之间的整数分钟`,
      400,
    );
  }

  ensureDatabase();
  setSetting('sms_sync_enabled', String(body.enabled));
  setSetting('sms_sync_interval', String(body.interval));

  const sync = await restartSmsScheduler();
  return jsonOk({ success: true, sync });
}, '保存短信同步设置失败');
