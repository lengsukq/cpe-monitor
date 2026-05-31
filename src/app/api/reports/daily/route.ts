import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';
import { generateDailyReport } from '@/lib/report-generator';

let dbInitialized = false;

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    if (!dbInitialized) { initializeDatabase(); dbInitialized = true; }

    const reports = db.prepare('SELECT * FROM daily_reports ORDER BY report_date DESC LIMIT 30').all();
    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json({ error: '获取报告列表失败' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const report = await generateDailyReport();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: '生成报告失败' }, { status: 500 });
  }
}
