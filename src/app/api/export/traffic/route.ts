import { requireSession, withApiHandler } from '@/lib/api-route';
import { db, ensureDatabaseReady } from '@/lib/db';

interface TrafficExportRow {
  timestamp: string;
  upload_bytes: number | null;
  download_bytes: number | null;
  delta_upload_bytes: number | null;
  delta_download_bytes: number | null;
  upload_bps: number | null;
  download_bps: number | null;
  connected_devices: number | null;
  signal_strength: number | null;
  network_type: string | null;
  band: string | null;
  rsrp: number | null;
  rsrq: number | null;
  sinr: number | null;
  rssi: number | null;
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
  if (start) { conditions.push('timestamp >= ?'); bindings.push(start); }
  if (end) { conditions.push('timestamp <= ?'); bindings.push(end); }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(
    `SELECT timestamp, upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
            upload_bps, download_bps, connected_devices, signal_strength,
            network_type, band, rsrp, rsrq, sinr, rssi
     FROM traffic_data ${whereClause}
     ORDER BY timestamp ASC
     LIMIT 50000`,
  ).all(...bindings) as TrafficExportRow[];

  const header = [
    '时间', '上传累计(bytes)', '下载累计(bytes)', '上传增量(bytes)', '下载增量(bytes)',
    '上传速率(bps)', '下载速率(bps)', '连接设备数', '信号强度',
    '网络制式', '频段', 'RSRP', 'RSRQ', 'SINR', 'RSSI',
  ].join(',');

  const csvRows = rows.map((row) => [
    row.timestamp,
    row.upload_bytes, row.download_bytes,
    row.delta_upload_bytes, row.delta_download_bytes,
    row.upload_bps, row.download_bps,
    row.connected_devices, row.signal_strength,
    row.network_type, row.band,
    row.rsrp, row.rsrq, row.sinr, row.rssi,
  ].map(escapeCsv).join(','));

  const csv = [header, ...csvRows].join('\n');
  const filename = `traffic_export_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}, '导出流量数据失败');
