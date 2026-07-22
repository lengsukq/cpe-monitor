import { ApiError, jsonOk, parseJsonBody, requireSession, withApiHandler } from '@/lib/api-route';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { findUserById, updateUserPassword } from '@/lib/repositories/user-repository';

export const POST = withApiHandler(async (request) => {
  const session = await requireSession();
  const body = await parseJsonBody<{ currentPassword?: string; newPassword?: string }>(request);
  if (!body.currentPassword || !body.newPassword) {
    throw new ApiError('请输入当前密码和新密码', 400);
  }
  const user = findUserById(session.userId);
  if (!user) throw new ApiError('用户不存在', 404);
  if (!await verifyPassword(body.currentPassword, user.passwordHash)) {
    throw new ApiError('当前密码错误', 401);
  }
  updateUserPassword(user.id, await hashPassword(body.newPassword));
  return jsonOk({ success: true });
}, '修改密码失败');
