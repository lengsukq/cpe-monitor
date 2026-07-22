import { jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { listRecentAlertLogs } from '@/lib/repositories/alert-repository';

export const GET = withApiHandler(async () => {
  await requireSession();
  return jsonOk(listRecentAlertLogs(100));
}, '获取告警日志失败');
