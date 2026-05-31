import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

let dbInitialized = false;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: '请输入当前密码和新密码' }, { status: 400 });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as any;

    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) return NextResponse.json({ error: '当前密码错误' }, { status: 401 });

    const newPasswordHash = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
  }
}
