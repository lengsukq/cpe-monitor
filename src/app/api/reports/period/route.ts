import { jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { listPeriodReports } from '@/lib/repositories/report-repository';

export const GET = withApiHandler(async (request) => {
  await requireSession();
  const url = new URL(request.url);
  const type = url.searchParams.get('type'); // 'weekly' | 'monthly'
  const limit = Math.min(52, Math.max(1, Number(url.searchParams.get('limit')) || 20));

  if (type !== 'weekly' && type !== 'monthly') {
    return jsonOk({ reports: [] });
  }

  const rows = listPeriodReports(type, limit);
  const reports = rows.map((row) => ({
    id: row.id,
    periodKey: row.report_date,
    periodType: row.period_type,
    totalUpload: row.total_upload,
    totalDownload: row.total_download,
    topDevices: row.top_devices ? JSON.parse(row.top_devices) : [],
    avgSignal: row.avg_signal,
    networkQuality: row.network_quality,
    createdAt: row.created_at,
  }));

  return jsonOk({ reports });
}, '获取周期报告失败');
