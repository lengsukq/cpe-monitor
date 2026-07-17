import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';
import { resetCpeClient } from '@/lib/cpe-client';

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

    if (config) {
      const safeConfig = { ...config };
      delete safeConfig.cpe_password_encrypted;
      return NextResponse.json({
        ...safeConfig,
        cpe_password_set: Boolean(process.env.CPE_PASSWORD || config.cpe_password_encrypted),
        password_source: process.env.CPE_PASSWORD ? 'env' : config.cpe_password_encrypted ? 'database' : 'unset',
      });
    }

    return NextResponse.json({
      cpe_url: process.env.CPE_DEFAULT_URL || 'http://192.168.31.1',
      cpe_username: process.env.CPE_USERNAME || 'admin',
      cpe_password_set: Boolean(process.env.CPE_PASSWORD),
      password_source: process.env.CPE_PASSWORD ? 'env' : 'unset',
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

    const password = typeof cpePassword === 'string' && cpePassword.trim() ? cpePassword.trim() : null;

    if (existing) {
      if (password) {
        db.prepare('UPDATE cpe_config SET cpe_url = ?, cpe_username = ?, cpe_password_encrypted = ?, updated_at = datetime("now") WHERE id = ?')
          .run(cpeUrl, cpeUsername, password, existing.id);
      } else {
        db.prepare('UPDATE cpe_config SET cpe_url = ?, cpe_username = ?, updated_at = datetime("now") WHERE id = ?')
          .run(cpeUrl, cpeUsername, existing.id);
      }
    } else {
      if (!password && !process.env.CPE_PASSWORD) {
        return NextResponse.json({ error: '请先设置 CPE_PASSWORD 或输入 CPE 密码' }, { status: 400 });
      }
      db.prepare('INSERT INTO cpe_config (cpe_url, cpe_username, cpe_password_encrypted) VALUES (?, ?, ?)')
        .run(cpeUrl, cpeUsername, password);
    }

    resetCpeClient();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '保存CPE配置失败' }, { status: 500 });
  }
}
