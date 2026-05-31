import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    return NextResponse.json({
      userId: session.userId,
      username: session.username,
    });
  } catch (error) {
    return NextResponse.json({ error: '认证失败' }, { status: 401 });
  }
}
