import cron, { ScheduledTask } from 'node-cron';
import { db, initializeDatabase } from './db';
import { CpeClient } from './cpe-client';
import { generateDailyReport } from './report-generator';

let hourlyTask: ScheduledTask | null = null;
let dailyTask: ScheduledTask | null = null;

export async function startScheduler() {
  initializeDatabase();

  const settings = db.prepare('SELECT * FROM system_settings').all() as any[];
  const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

  const enabled = settingsMap['scheduler_enabled'] === 'true';
  const interval = parseInt(settingsMap['scheduler_interval'] || '60');

  if (!enabled) {
    console.log('Scheduler is disabled');
    return;
  }

  stopScheduler();

  const cronExpression = interval <= 5 ? '*/5 * * * *' : interval <= 15 ? '*/15 * * * *' : interval <= 30 ? '*/30 * * * *' : '0 * * * *';

  hourlyTask = cron.schedule(cronExpression, async () => {
    console.log('Running hourly traffic collection...');
    await collectTrafficData();
    await checkAlerts();
  });

  dailyTask = cron.schedule('0 22 * * *', async () => {
    console.log('Generating daily report...');
    await generateAndSendDailyReport();
  });

  console.log(`Scheduler started with interval: ${interval} minutes`);
}

export function stopScheduler() {
  if (hourlyTask) { hourlyTask.stop(); hourlyTask = null; }
  if (dailyTask) { dailyTask.stop(); dailyTask = null; }
}

export function getSchedulerStatus(): { running: boolean } {
  return { running: hourlyTask !== null };
}

async function collectTrafficData() {
  try {
    const cpeConfigResult = db.prepare('SELECT * FROM cpe_config LIMIT 1').get() as any;

    if (!cpeConfigResult) {
      console.log('No CPE config found');
      return;
    }

    const client = new CpeClient(
      cpeConfigResult.cpe_url,
      cpeConfigResult.cpe_username || 'admin',
      cpeConfigResult.cpe_password_encrypted || ''
    );

    const trafficInfo = await client.getTrafficData();

    db.prepare('INSERT INTO traffic_data (upload_bytes, download_bytes, connected_devices, signal_strength) VALUES (?, ?, ?, ?)')
      .run(trafficInfo.uploadBytes, trafficInfo.downloadBytes, trafficInfo.connectedDevices, trafficInfo.signalStrength);

    for (const device of trafficInfo.devices) {
      db.prepare('INSERT INTO device_data (device_name, device_ip, device_mac, upload_bytes, download_bytes, online_duration) VALUES (?, ?, ?, ?, ?, ?)')
        .run(device.name, device.ip, device.mac, device.uploadBytes, device.downloadBytes, device.onlineDuration);
    }

    console.log(`Collected traffic data: ${trafficInfo.connectedDevices} devices`);
  } catch (error) {
    console.error('Failed to collect traffic data:', error);
  }
}

async function checkAlerts() {
  try {
    const rules = db.prepare('SELECT * FROM alert_rules WHERE enabled = 1').all() as any[];

    for (const rule of rules) {
      const shouldAlert = await evaluateRule(rule);
      if (shouldAlert) {
        const recentAlert = db.prepare('SELECT * FROM alert_logs WHERE rule_id = ? ORDER BY triggered_at DESC LIMIT 1').get(rule.id) as any;

        if (recentAlert) {
          const lastAlertTime = new Date(recentAlert.triggered_at).getTime();
          const cooldownMs = (rule.cooldown_minutes || 30) * 60 * 1000;
          if (Date.now() - lastAlertTime < cooldownMs) continue;
        }

        db.prepare('INSERT INTO alert_logs (rule_id, message, notified) VALUES (?, ?, ?)').run(rule.id, `Alert triggered: ${rule.name}`, 0);
        console.log(`Alert triggered: ${rule.name}`);
      }
    }
  } catch (error) {
    console.error('Failed to check alerts:', error);
  }
}

async function evaluateRule(rule: any): Promise<boolean> {
  const latestTraffic = db.prepare('SELECT * FROM traffic_data ORDER BY timestamp DESC LIMIT 1').get() as any;
  if (!latestTraffic) return false;

  let value = 0;
  switch (rule.metric_type) {
    case 'traffic_up': value = latestTraffic.upload_bytes || 0; break;
    case 'traffic_down': value = latestTraffic.download_bytes || 0; break;
    case 'devices': value = latestTraffic.connected_devices || 0; break;
    case 'signal': value = latestTraffic.signal_strength || 0; break;
    default: return false;
  }

  switch (rule.operator) {
    case '>': return value > rule.threshold;
    case '<': return value < rule.threshold;
    case '>=': return value >= rule.threshold;
    case '<=': return value <= rule.threshold;
    default: return false;
  }
}

async function generateAndSendDailyReport() {
  try {
    const report = await generateDailyReport();

    db.prepare('INSERT INTO daily_reports (report_date, total_upload, total_download, peak_hour, top_devices, avg_signal, uptime_percent, network_quality) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(report.reportDate, report.totalUpload, report.totalDownload, report.peakHour, report.topDevices, report.avgSignal, report.uptimePercent, report.networkQuality);

    console.log('Daily report generated and stored');
  } catch (error) {
    console.error('Failed to generate daily report:', error);
  }
}
