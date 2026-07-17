import { db } from './db';

export async function generateDailyReport() {
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const todayStr = dateFormatter.format(now);
  const today = new Date(`${todayStr}T00:00:00+08:00`);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const sqliteTimestamp = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');
  const todayIso = sqliteTimestamp(today);
  const tomorrowIso = sqliteTimestamp(tomorrow);

  // Get today's traffic data
  const todayTraffic = db.prepare(
    'SELECT * FROM traffic_data WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp'
  ).all(todayIso, tomorrowIso) as any[];

  // Calculate totals
  let totalUpload = 0;
  let totalDownload = 0;
  let totalSignal = 0;
  let signalCount = 0;
  const hourlyTraffic: Record<number, number> = {};

  for (const data of todayTraffic) {
    totalUpload += data.upload_bytes || 0;
    totalDownload += data.download_bytes || 0;

    if (data.signal_strength) {
      totalSignal += data.signal_strength;
      signalCount++;
    }

    const timestamp = new Date(`${String(data.timestamp).replace(' ', 'T')}Z`);
    const hour = Number(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Shanghai', hour: '2-digit', hour12: false,
    }).format(timestamp));
    hourlyTraffic[hour] = (hourlyTraffic[hour] || 0) + (data.download_bytes || 0) + (data.upload_bytes || 0);
  }

  // Find peak hour
  let peakHour = 0;
  let maxTraffic = 0;
  for (const [hour, traffic] of Object.entries(hourlyTraffic)) {
    if (traffic > maxTraffic) {
      maxTraffic = traffic;
      peakHour = parseInt(hour);
    }
  }

  // Get device rankings
  const todayDevices = db.prepare(
    'SELECT * FROM device_data WHERE timestamp >= ? AND timestamp <= ?'
  ).all(todayIso, tomorrowIso) as any[];

  const deviceMap: Record<string, any> = {};
  for (const device of todayDevices) {
    const key = device.device_mac || device.device_ip || 'unknown';
    if (!deviceMap[key]) {
      deviceMap[key] = {
        name: device.device_name || 'Unknown',
        ip: device.device_ip || '',
        mac: device.device_mac || '',
        uploadBytes: 0,
        downloadBytes: 0,
        totalBytes: 0,
      };
    }
    deviceMap[key].uploadBytes += device.upload_bytes || 0;
    deviceMap[key].downloadBytes += device.download_bytes || 0;
    deviceMap[key].totalBytes = deviceMap[key].uploadBytes + deviceMap[key].downloadBytes;
  }

  const topDevices = Object.values(deviceMap)
    .sort((a: any, b: any) => b.totalBytes - a.totalBytes)
    .slice(0, 10);

  // Calculate network quality
  const avgSignal = signalCount > 0 ? Math.round(totalSignal / signalCount) : 0;
  const intervalSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'scheduler_interval'").get() as { value?: string } | undefined;
  const intervalMinutes = Math.max(1, Number(intervalSetting?.value || 60));
  const expectedSamples = (24 * 60) / intervalMinutes;
  const uptimePercent = todayTraffic.length > 0 ? Math.min(100, (todayTraffic.length / expectedSamples) * 100) : 0;

  let networkQuality = '差';
  if (avgSignal >= -70 && uptimePercent >= 95) {
    networkQuality = '优秀';
  } else if (avgSignal >= -85 && uptimePercent >= 85) {
    networkQuality = '良好';
  } else if (avgSignal >= -100 && uptimePercent >= 70) {
    networkQuality = '一般';
  }

  return {
    id: 0,
    reportDate: todayStr,
    totalUpload,
    totalDownload,
    peakHour,
    topDevices,
    avgSignal,
    uptimePercent,
    networkQuality,
    sentAt: null,
    createdAt: null,
  };
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
