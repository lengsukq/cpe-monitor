import { db } from '@/lib/db';
import { ensureDatabase, jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { generateDailyReport } from '@/lib/report-generator';
import { mapDailyReportRows, type DailyReportRow } from '@/lib/mappers/daily-report';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  const reports = db.prepare(
    'SELECT * FROM daily_reports ORDER BY report_date DESC LIMIT 30',
  ).all() as DailyReportRow[];
  return jsonOk(mapDailyReportRows(reports));
}, '获取报告列表失败');

export const POST = withApiHandler(async () => {
  await requireSession();
  const report = await generateDailyReport();
  return jsonOk(report);
}, '生成报告失败');
