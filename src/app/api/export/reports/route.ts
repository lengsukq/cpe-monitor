import { requireSession, withApiHandler } from '@/lib/api-route';
import { db, ensureDatabaseReady } from '@/lib/db';

interface ReportExportRow {
  report_date: string;
  total_upload: number | null;
  total_download: number | null;
  peak_hour: number | null;
  avg_signal: number | null;
  uptime_percent: number | null;
  network_quality: string | null;
  sent_at: string | null;
  created_at: string | null;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET = withApiHandler(async (request) => {
  await requireSession();
  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  ensureDatabaseReady();

  const conditions: string[] = [];
  const bindings: string[] = [];
  if (start) { conditions.push('report_date >= ?'); bindings.push(start); }
  if (end) { conditions.push('report_date <= ?'); bindings.push(end); }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(
    `SELECT report_date, total_upload, total_download, peak_hour,
            avg_signal, uptime_percent, network_quality, sent_at, created_at
     FROM daily_reports ${whereClause}
     ORDER BY report_date ASC
     LIMIT 10000`,
  ).all(...bindings) as ReportExportRow[];

  const header = [
    '日期', '总上传(bytes)', '总下载(bytes)', '峰值时段',
    '平均信号', '在线率(%)', '网络质量', '发送时间', '创建时间',
  ].join(',');

  const csvRows = rows.map((row) => [
    row.report_date, row.total_upload, row.total_download,
    row.peak_hour !== null ? `${row.peak_hour}:00` : '',
    row.avg_signal, row.uptime_percent,
    row.network_quality, row.sent_at, row.created_at,
  ].map(escapeCsv).join(','));

  const csv = [header, ...csvRows].join('\n');
  const filename = `reports_export_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}, '导出报告数据失败');
