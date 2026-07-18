import { ensureDatabase, jsonOk, requireSession, withApiHandler, ApiError } from '@/lib/api-route';
import { ensureSchedulerStarted, getSmsSyncStatus, syncSmsMessages } from '@/lib/scheduler';

export const POST = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  await ensureSchedulerStarted();

  try {
    const result = await syncSmsMessages();
    return jsonOk({ success: true, result, sync: getSmsSyncStatus() });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : '短信同步失败',
      502,
    );
  }
}, '短信同步失败');
