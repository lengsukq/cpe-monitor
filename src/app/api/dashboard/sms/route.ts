import { jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { getStoredSmsSnapshot, getStoredSmsPaginated } from '@/lib/repositories/sms-repository';
import { ensureSchedulerStarted, getSmsSyncStatus } from '@/lib/scheduler';

export const GET = withApiHandler(async (request) => {
  await requireSession();
  await ensureSchedulerStarted();

  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page');

  // If page param is provided, use paginated response
  if (page) {
    const result = getStoredSmsPaginated({
      page: Number.parseInt(page, 10) || 1,
      pageSize: Number.parseInt(searchParams.get('pageSize') || '50', 10),
      filter: (searchParams.get('filter') as 'all' | 'unread' | 'read') || 'all',
      direction: (searchParams.get('direction') as 'all' | 'inbound' | 'outbound') || 'all',
      keyword: searchParams.get('keyword') || undefined,
    });
    return jsonOk({ ...result, readOnly: true, sync: getSmsSyncStatus() });
  }

  // Legacy: return all messages
  return jsonOk({ ...getStoredSmsSnapshot(), readOnly: true, sync: getSmsSyncStatus() });
}, '获取本地短信失败');
