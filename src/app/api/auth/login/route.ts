import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, createToken } from '@/lib/auth';
import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  withApiHandler,
} from '@/lib/api-route';

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
}

export const POST = withApiHandler(async (request) => {
  ensureDatabase();
  const body = await parseJsonBody<{ password?: string }>(request);
  if (!body.password) {
    throw new ApiError('请输入密码', 400);
  }

  let adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as UserRow | undefined;

  if (!adminUser) {
    const envPassword = process.env.ADMIN_PASSWORD;
    if (!envPassword) {
      throw new ApiError('系统未配置管理员密码', 500);
    }

    const passwordHash = await hashPassword(envPassword);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', passwordHash);
    adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as UserRow | undefined;
  }

  if (!adminUser) {
    throw new ApiError('管理员账户初始化失败', 500);
  }

  const isValid = await verifyPassword(body.password, adminUser.password_hash);
  if (!isValid) {
    throw new ApiError('密码错误', 401);
  }

  const token = await createToken({
    userId: adminUser.id,
    username: adminUser.username,
  });

  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });

  return jsonOk({ success: true, username: adminUser.username });
}, '登录失败');
