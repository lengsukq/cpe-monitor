import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import {
  listNotificationConfigRows,
  upsertNotificationConfig,
} from '@/lib/settings-store';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  return jsonOk(listNotificationConfigRows());
}, '获取通知配置失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();
  const body = await parseJsonBody<{
    type?: 'email' | 'wechat';
    config?: unknown;
    enabled?: boolean;
  }>(request);

  if (!body.type || !body.config || !['email', 'wechat'].includes(body.type)) {
    throw new ApiError('通知配置格式不正确', 400);
  }

  upsertNotificationConfig({
    type: body.type,
    config: body.config,
    enabled: body.enabled,
  });

  return jsonOk({ success: true });
}, '保存通知配置失败');
