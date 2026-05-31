import { db } from './db';

export async function generateDailyReport() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = today.toISOString().split('T')[0];
  const todayIso = today.toISOString();
  const tomorrowIso = tomorrow.toISOString();

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

    const hour = new Date(data.timestamp).getHours();
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
  const uptimePercent = todayTraffic.length > 0 ? (todayTraffic.length / 24) * 100 : 0;

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
