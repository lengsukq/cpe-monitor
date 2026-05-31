import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';

let dbInitialized = false;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    if (!dbInitialized) {
      initializeDatabase();
      dbInitialized = true;
    }

    const config = db.prepare('SELECT * FROM cpe_config LIMIT 1').get() as any;

    return NextResponse.json(config || {
      cpe_url: process.env.CPE_DEFAULT_URL || 'http://192.168.31.1',
      cpe_username: 'admin',
    });
  } catch (error) {
    return NextResponse.json({ error: '获取CPE配置失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    if (!dbInitialized) {
      initializeDatabase();
      dbInitialized = true;
    }

    const { cpeUrl, cpeUsername, cpePassword } = await request.json();
    const existing = db.prepare('SELECT * FROM cpe_config LIMIT 1').get() as any;

    if (existing) {
      db.prepare('UPDATE cpe_config SET cpe_url = ?, cpe_username = ?, cpe_password_encrypted = ?, updated_at = datetime("now") WHERE id = ?')
        .run(cpeUrl, cpeUsername, cpePassword, existing.id);
    } else {
      db.prepare('INSERT INTO cpe_config (cpe_url, cpe_username, cpe_password_encrypted) VALUES (?, ?, ?)')
        .run(cpeUrl, cpeUsername, cpePassword);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '保存CPE配置失败' }, { status: 500 });
  }
}
