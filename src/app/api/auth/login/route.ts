import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { hashPassword, verifyPassword, createToken } from '@/lib/auth';
import { cookies } from 'next/headers';

let dbInitialized = false;

export async function POST(request: Request) {
  try {
    if (!dbInitialized) {
      initializeDatabase();
      dbInitialized = true;
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: '请输入密码' }, { status: 400 });
    }

    let adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;

    if (!adminUser) {
      const envPassword = process.env.ADMIN_PASSWORD;
      if (!envPassword) {
        return NextResponse.json({ error: '系统未配置管理员密码' }, { status: 500 });
      }

      const passwordHash = await hashPassword(envPassword);
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', passwordHash);
      adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
    }

    const isValid = await verifyPassword(password, adminUser.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
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

    return NextResponse.json({ success: true, username: adminUser.username });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
