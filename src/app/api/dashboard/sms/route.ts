import { jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { getStoredSmsSnapshot } from '@/lib/repositories/sms-repository';
import { ensureSchedulerStarted, getSmsSyncStatus } from '@/lib/scheduler';

export const GET = withApiHandler(async () => {
  await requireSession();
  await ensureSchedulerStarted();
  return jsonOk({ ...getStoredSmsSnapshot(), readOnly: true, sync: getSmsSyncStatus() });
}, '获取本地短信失败');
