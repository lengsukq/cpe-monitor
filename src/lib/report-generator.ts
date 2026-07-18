import { db, toSqliteTimestamp } from './db';

export async function generateDailyReport() {
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const todayStr = dateFormatter.format(now);
  const today = new Date(`${todayStr}T00:00:00+08:00`);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const todayIso = toSqliteTimestamp(today);
  const tomorrowIso = toSqliteTimestamp(tomorrow);

  // Get today's traffic data (ordered chronologically)
  const todayTraffic = db.prepare(
    'SELECT * FROM traffic_data WHERE timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC'
  ).all(todayIso, tomorrowIso) as any[];

  // upload_bytes/download_bytes are CPE cumulative values.
  // Daily total = last record - first record (delta).
  let totalUpload = 0;
  let totalDownload = 0;
  const last = todayTraffic[todayTraffic.length - 1];
  const first = todayTraffic[0];
  if (todayTraffic.length >= 2 && first && last) {
    totalUpload = Math.max(0, last.upload_bytes - first.upload_bytes);
    totalDownload = Math.max(0, last.download_bytes - first.download_bytes);
  } else if (todayTraffic.length === 1 && last) {
    // Only one data point — we cannot compute delta, show 0.
    totalUpload = 0;
    totalDownload = 0;
  }

  // Compute hourly traffic deltas and signal averages
  let totalSignal = 0;
  let signalCount = 0;
  let previousPoint: any = null;
  const hourlyTraffic: Record<number, number> = {};

  for (const data of todayTraffic) {
    if (data.signal_strength) {
      totalSignal += data.signal_strength;
      signalCount++;
    }

    // Compute delta from previous point for hourly breakdown
    if (previousPoint && data.upload_bytes != null && previousPoint.upload_bytes != null) {
      const uploadDelta = Math.max(0, data.upload_bytes - previousPoint.upload_bytes);
      const downloadDelta = Math.max(0, data.download_bytes - previousPoint.download_bytes);

      const timestamp = new Date(`${String(data.timestamp).replace(' ', 'T')}Z`);
      const hour = Number(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Shanghai', hour: '2-digit', hour12: false,
      }).format(timestamp));
      hourlyTraffic[hour] = (hourlyTraffic[hour] || 0) + uploadDelta + downloadDelta;
    }
    previousPoint = data;
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

  // Get device rankings — also computed via delta
  // Use the first and last records per device within today
  const todayDevices = db.prepare(
    'SELECT * FROM device_data WHERE timestamp >= ? AND timestamp <= ? ORDER BY device_mac, device_ip, timestamp ASC'
  ).all(todayIso, tomorrowIso) as any[];

  const deviceFirstMap: Record<string, any> = {};
  const deviceLastMap: Record<string, any> = {};
  for (const device of todayDevices) {
    const key = device.device_mac || device.device_ip || 'unknown';
    if (!deviceFirstMap[key]) {
      deviceFirstMap[key] = device;
    }
    deviceLastMap[key] = device;
  }

  const deviceMap: Record<string, any> = {};
  for (const key of Object.keys(deviceLastMap)) {
    const last = deviceLastMap[key];
    const first = deviceFirstMap[key];
    const uploadDelta = first && last
      ? Math.max(0, (last.upload_bytes || 0) - (first.upload_bytes || 0))
      : 0;
    const downloadDelta = first && last
      ? Math.max(0, (last.download_bytes || 0) - (first.download_bytes || 0))
      : 0;
    deviceMap[key] = {
      name: last.device_name || 'Unknown',
      ip: last.device_ip || '',
      mac: last.device_mac || '',
      uploadBytes: uploadDelta,
      downloadBytes: downloadDelta,
      totalBytes: uploadDelta + downloadDelta,
    };
  }

  const topDevices = Object.values(deviceMap)
    .sort((a: any, b: any) => b.totalBytes - a.totalBytes)
    .slice(0, 10);

  // Calculate network quality
  const avgSignal = signalCount > 0 ? Math.round(totalSignal / signalCount) : 0;
  const intervalSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'scheduler_interval'").get() as { value?: string } | undefined;
  const intervalMinutes = Math.max(1, Number(intervalSetting?.value || 60));
  const expectedSamples = (24 * 60) / intervalMinutes;
  // uptimePercent represents data collection completeness (actual samples / expected samples)
  // It is NOT network uptime. Low values usually mean the scheduler was recently enabled
  // or the collection interval was recently changed.
  const samplingRatio = todayTraffic.length > 0 ? Math.min(1, todayTraffic.length / expectedSamples) : 0;
  const uptimePercent = Math.round(samplingRatio * 1000) / 10;

  let networkQuality = '数据不足';
  if (todayTraffic.length >= 3) {
    if (avgSignal >= -70 && samplingRatio >= 0.7) {
      networkQuality = '优秀';
    } else if (avgSignal >= -85 && samplingRatio >= 0.5) {
      networkQuality = '良好';
    } else if (avgSignal >= -100 && samplingRatio >= 0.3) {
      networkQuality = '一般';
    } else if (avgSignal < -100) {
      networkQuality = '差';
    } else {
      networkQuality = '一般';
    }
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
