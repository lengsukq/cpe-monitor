import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { startScheduler, stopScheduler, getSchedulerStatus } from '@/lib/scheduler';
import { getSetting, getSettingsMap, setSetting } from '@/lib/settings-store';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  const settingsMap = getSettingsMap();
  return jsonOk({
    enabled: settingsMap.scheduler_enabled === 'true',
    interval: parseInt(settingsMap.scheduler_interval || '60', 10),
    running: getSchedulerStatus().running,
  });
}, '获取调度状态失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();
  const body = await parseJsonBody<{ enabled?: boolean; interval?: number }>(request);
  if (typeof body.enabled !== 'boolean') {
    throw new ApiError('参数无效', 400);
  }

  setSetting('scheduler_enabled', String(body.enabled));
  if (body.interval !== undefined) {
    const parsedInterval = Number(body.interval);
    if (!Number.isInteger(parsedInterval) || parsedInterval < 1 || parsedInterval > 1440) {
      throw new ApiError('采集间隔必须是 1 到 1440 分钟之间的整数', 400);
    }
    setSetting('scheduler_interval', String(parsedInterval));
  }

  const persistedInterval = parseInt(getSetting('scheduler_interval', '60'), 10) || 60;

  if (body.enabled) {
    await startScheduler();
  } else {
    stopScheduler();
  }

  return jsonOk({
    success: true,
    status: {
      enabled: Boolean(body.enabled),
      interval: persistedInterval,
      running: getSchedulerStatus().running,
    },
  });
}, '更新调度设置失败');
