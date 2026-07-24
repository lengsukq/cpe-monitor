import { jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { listAlertLogsPaginated } from '@/lib/repositories/alert-repository';

export const GET = withApiHandler(async (request) => {
  await requireSession();
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get('pageSize')) || 30));
  const notified = url.searchParams.get('notified'); // '0' | '1' | null
  const ruleId = url.searchParams.get('ruleId');
  const result = listAlertLogsPaginated({
    page,
    pageSize,
    notified: notified !== null ? Number(notified) : undefined,
    ruleId: ruleId ? Number(ruleId) : undefined,
  });
  return jsonOk(result);
}, '获取告警日志失败');
