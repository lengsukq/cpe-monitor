import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CpeClient } from '@/lib/cpe-client';
import { db, initializeDatabase } from '@/lib/db';

let dbInitialized = false;

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    let body: any = {};
    try { body = await request.json(); } catch {}

    const { cpeUrl: reqUrl, cpeUsername: reqUsername, cpePassword: reqPassword } = body;
    const config = db.prepare('SELECT * FROM cpe_config LIMIT 1').get() as any || {};

    const finalUrl = reqUrl || config.cpe_url || 'http://192.168.31.1';
    const finalUsername = reqUsername || config.cpe_username || 'admin';
    const finalPassword = reqPassword || config.cpe_password_encrypted;

    if (!finalPassword) {
      return NextResponse.json({ success: false, message: '请先输入 CPE 密码' }, { status: 400 });
    }

    // Test with a fresh client (don't use singleton for testing)
    const client = new CpeClient(finalUrl, finalUsername, finalPassword);
    const startTime = Date.now();
    const loginResult = await client.login();
    const latency = Date.now() - startTime;

    if (loginResult) {
      return NextResponse.json({ success: true, message: 'CPE 连接成功', latency: `${latency}ms`, deviceUrl: finalUrl });
    } else {
      return NextResponse.json({ success: false, message: 'CPE 连接失败，请检查地址和密码', latency: `${latency}ms` });
    }
  } catch (error: any) {
    console.error('CPE test error:', error);
    return NextResponse.json({ success: false, message: `连接错误: ${error.message || '未知错误'}` }, { status: 500 });
  }
}
