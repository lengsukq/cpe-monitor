import { jsonOk, requireSession, withApiHandler } from '@/lib/api-route';

export const GET = withApiHandler(async () => {
  const session = await requireSession();
  return jsonOk({
    userId: session.userId,
    username: session.username,
  });
}, '认证失败');
