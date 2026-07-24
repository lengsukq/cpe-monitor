import { requireSession, withApiHandler } from '@/lib/api-route';
import { db, ensureDatabaseReady } from '@/lib/db';

interface DeviceExportRow {
  timestamp: string;
  device_name: string | null;
  device_ip: string | null;
  device_mac: string | null;
  upload_bytes: number | null;
  download_bytes: number | null;
  delta_upload_bytes: number | null;
  delta_download_bytes: number | null;
  upload_bps: number | null;
  download_bps: number | null;
  online_duration: number | null;
  interface_type: string | null;
  frequency: string | null;
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
  const mac = url.searchParams.get('mac');

  ensureDatabaseReady();

  const conditions: string[] = [];
  const bindings: string[] = [];
  if (start) { conditions.push('timestamp >= ?'); bindings.push(start); }
  if (end) { conditions.push('timestamp <= ?'); bindings.push(end); }
  if (mac) { conditions.push('device_mac = ?'); bindings.push(mac); }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(
    `SELECT timestamp, device_name, device_ip, device_mac,
            upload_bytes, download_bytes, delta_upload_bytes, delta_download_bytes,
            upload_bps, download_bps, online_duration, interface_type, frequency, rssi
     FROM device_data ${whereClause}
     ORDER BY timestamp ASC
     LIMIT 50000`,
  ).all(...bindings) as DeviceExportRow[];

  const header = [
    '时间', '设备名', 'IP', 'MAC',
    '上传累计(bytes)', '下载累计(bytes)', '上传增量(bytes)', '下载增量(bytes)',
    '上传速率(bps)', '下载速率(bps)', '在线时长(s)', '接口类型', '频段', 'RSSI',
  ].join(',');

  const csvRows = rows.map((row) => [
    row.timestamp, row.device_name, row.device_ip, row.device_mac,
    row.upload_bytes, row.download_bytes,
    row.delta_upload_bytes, row.delta_download_bytes,
    row.upload_bps, row.download_bps,
    row.online_duration, row.interface_type, row.frequency, row.rssi,
  ].map(escapeCsv).join(','));

  const csv = [header, ...csvRows].join('\n');
  const filename = `devices_export_${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response('\uFEFF' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}, '导出设备数据失败');
