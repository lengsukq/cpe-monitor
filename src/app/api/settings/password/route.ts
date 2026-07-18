import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

interface UserRow {
  id: number;
  password_hash: string;
}

export const POST = withApiHandler(async (request) => {
  const session = await requireSession();
  ensureDatabase();
  const body = await parseJsonBody<{
    currentPassword?: string;
    newPassword?: string;
  }>(request);

  if (!body.currentPassword || !body.newPassword) {
    throw new ApiError('请输入当前密码和新密码', 400);
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as UserRow | undefined;
  if (!user) {
    throw new ApiError('用户不存在', 404);
  }

  const isValid = await verifyPassword(body.currentPassword, user.password_hash);
  if (!isValid) {
    throw new ApiError('当前密码错误', 401);
  }

  const newPasswordHash = await hashPassword(body.newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, session.userId);
  return jsonOk({ success: true });
}, '修改密码失败');
