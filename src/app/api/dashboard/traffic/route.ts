import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';

let dbInitialized = false;

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    if (!dbInitialized) {
      initializeDatabase();
      dbInitialized = true;
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';

    const now = new Date();
    let startTime: Date;

    switch (range) {
      case '1h': startTime = new Date(now.getTime() - 60 * 60 * 1000); break;
      case '6h': startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000); break;
      case '7d': startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '24h': default: startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const data = db.prepare(
      'SELECT timestamp, upload_bytes, download_bytes, connected_devices, signal_strength FROM traffic_data WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp'
    ).all(startTime.toISOString(), now.toISOString());

    return NextResponse.json(data);
  } catch (error) {
    console.error('Traffic history error:', error);
    return NextResponse.json({ error: '获取流量数据失败' }, { status: 500 });
  }
}
