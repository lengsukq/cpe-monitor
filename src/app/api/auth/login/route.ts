import { cookies } from 'next/headers';
import { hashPassword, verifyPassword, createToken } from '@/lib/auth';
import { ApiError, jsonOk, parseJsonBody, withApiHandler } from '@/lib/api-route';
import { createUser, findUserByUsername } from '@/lib/repositories/user-repository';

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody<{ password?: string }>(request);
  if (!body.password) throw new ApiError('请输入密码', 400);

  let adminUser = findUserByUsername('admin');
  if (!adminUser) {
    const envPassword = process.env.ADMIN_PASSWORD;
    if (!envPassword) throw new ApiError('系统未配置管理员密码', 500);
    adminUser = createUser('admin', await hashPassword(envPassword));
  }

  if (!await verifyPassword(body.password, adminUser.passwordHash)) {
    throw new ApiError('密码错误', 401);
  }

  const token = await createToken({ userId: adminUser.id, username: adminUser.username });
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIE === 'true',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  return jsonOk({ success: true, username: adminUser.username });
}, '登录失败');
