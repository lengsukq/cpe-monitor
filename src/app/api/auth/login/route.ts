import { cookies } from 'next/headers';
import { verifyAdminPassword, createToken } from '@/lib/auth';
import { ApiError, jsonOk, parseJsonBody, withApiHandler } from '@/lib/api-route';

export const POST = withApiHandler(async (request) => {
  const body = await parseJsonBody<{ password?: string }>(request);
  if (!body.password) throw new ApiError('请输入密码', 400);

  const valid = await verifyAdminPassword(body.password);
  if (!valid) {
    throw new ApiError('密码错误', 401);
  }

  const token = await createToken({ userId: 1, username: 'admin' });
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIE === 'true',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
  return jsonOk({ success: true, username: 'admin' });
}, '登录失败');
