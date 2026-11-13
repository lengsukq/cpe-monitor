import { db, initializeDatabase } from './db';
import { getSettingsMap, isCpeConfigured } from './settings-store';
import { collectTrafficData } from './traffic-collection-service';
import { checkAlerts } from './alert-service';
import { syncSmsMessages, getSmsSyncStatus } from './sms-sync-scheduler';
import { syncDeviceInfo, getDeviceInfoSyncStatus } from './device-info-sync-scheduler';
import {
  generateAndSendDailyReport,
  generateAndStoreMonthlyReport,
  generateAndStoreWeeklyReport,
} from './scheduler';
import { getMonthRange, getWeekRange } from './report-generator';
import { getAppDateKey } from './date-time';
import { writeSystemLog } from './system-log';
import {
  isDailyReportDue,
  isIntervalTaskDue,
  isMonthlyReportDue,
  isWeeklyReportDue,
} from './cron-schedule-eval';

function getLastTrafficTimestamp(): string | null {
  const row = db.prepare(
    `SELECT COALESCE(completed_at, started_at) AS ts
     FROM collection_runs
     WHERE status = 'success'
     ORDER BY id DESC
     LIMIT 1`,
  ).get() as { ts?: string } | undefined;
  return row?.ts || null;
}

function hasReportRow(periodType: 'daily' | 'weekly' | 'monthly', reportDate: string): boolean {
  const row = db.prepare(
    'SELECT 1 AS ok FROM daily_reports WHERE period_type = ? AND report_date = ? LIMIT 1',
  ).get(periodType, reportDate) as { ok?: number } | undefined;
  return Boolean(row?.ok);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const now = new Date();
  initializeDatabase();

  const settings = getSettingsMap();
  const schedulerEnabled = settings.scheduler_enabled === 'true';
  const trafficInterval = Math.max(1, parseInt(settings.scheduler_interval || '60', 10) || 60);
  const cpeReady = isCpeConfigured();

  const lastTrafficAt = getLastTrafficTimestamp();
  const trafficDue = cpeReady && isIntervalTaskDue({
    enabled: schedulerEnabled,
    intervalMinutes: trafficInterval,
    lastRunAt: lastTrafficAt,
    now,
  });

  const smsStatus = getSmsSyncStatus();
  const smsDue = cpeReady && isIntervalTaskDue({
    enabled: smsStatus.enabled,
    intervalMinutes: smsStatus.interval,
    lastRunAt: smsStatus.lastSyncedAt,
    now,
  });

  const deviceStatus = getDeviceInfoSyncStatus();
  const deviceDue = cpeReady && isIntervalTaskDue({
    enabled: deviceStatus.enabled,
    intervalMinutes: deviceStatus.interval,
    lastRunAt: deviceStatus.lastSyncedAt,
    now,
  });

  const todayKey = getAppDateKey(now);
  const weekKey = getWeekRange(now).key;
  const monthKey = getMonthRange(now).key;

  const dailyDue = isDailyReportDue(schedulerEnabled, hasReportRow('daily', todayKey), now);
  const weeklyDue = isWeeklyReportDue(schedulerEnabled, hasReportRow('weekly', weekKey), now);
  const monthlyDue = isMonthlyReportDue(schedulerEnabled, hasReportRow('monthly', monthKey), now);

  if (dryRun) {
    console.log(JSON.stringify({
      dryRun: true,
      cpeReady,
      schedulerEnabled,
      trafficDue,
      smsDue,
      deviceDue,
      dailyDue,
      weeklyDue,
      monthlyDue,
    }));
    return;
  }

  let hasFailure = false;
  const executed: string[] = [];

  if (trafficDue) {
    try {
      const result = await collectTrafficData('scheduler');
      executed.push(result.success ? 'traffic:ok' : 'traffic:failed');
      if (result.success) {
        await checkAlerts();
      } else {
        hasFailure = true;
      }
    } catch (error) {
      hasFailure = true;
      console.error('[cron-runner] traffic collection failed:', error);
    }
  }

  if (smsDue) {
    try {
      await syncSmsMessages();
      executed.push('sms:ok');
    } catch (error) {
      hasFailure = true;
      console.error('[cron-runner] sms sync failed:', error);
    }
  }

  if (deviceDue) {
    try {
      await syncDeviceInfo('scheduler');
      executed.push('device:ok');
    } catch (error) {
      hasFailure = true;
      console.error('[cron-runner] device sync failed:', error);
    }
  }

  if (dailyDue) {
    try {
      await generateAndSendDailyReport();
      executed.push('daily-report:ok');
    } catch (error) {
      hasFailure = true;
      console.error('[cron-runner] daily report failed:', error);
    }
  }

  if (weeklyDue) {
    try {
      generateAndStoreWeeklyReport();
      executed.push('weekly-report:ok');
    } catch (error) {
      hasFailure = true;
      console.error('[cron-runner] weekly report failed:', error);
    }
  }

  if (monthlyDue) {
    try {
      generateAndStoreMonthlyReport();
      executed.push('monthly-report:ok');
    } catch (error) {
      hasFailure = true;
      console.error('[cron-runner] monthly report failed:', error);
    }
  }

  if (executed.length > 0) {
    writeSystemLog(hasFailure ? 'warn' : 'info', `LightIsle Cron 执行完成: ${executed.join(', ')}`);
  }
  console.log(`[cron-runner] completed (${executed.length ? executed.join(', ') : 'nothing due'})`);

  if (hasFailure) {
    process.exitCode = 1;
  }
}

void main()
  .catch((error) => {
    console.error('[cron-runner] fatal error:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      db.close();
    } catch {
      // Ignore close failures on exit
    }
  });
