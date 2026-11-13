import { APP_TIME_ZONE, getAppDateKey, parseTimestampMs } from './date-time.ts';

const CRON_JITTER_TOLERANCE_MS = 60_000;

export interface ScheduleCheckInput {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null | undefined;
  now: Date;
}

/**
 * Checks whether an interval-based task is due, allowing a small tolerance
 * so 5-minute cron jitter does not skip an entire cycle.
 */
export function isIntervalTaskDue({
  enabled,
  intervalMinutes,
  lastRunAt,
  now,
}: ScheduleCheckInput): boolean {
  if (!enabled) return false;
  const lastMs = parseTimestampMs(lastRunAt);
  if (lastMs === null) return true;
  const requiredMs = Math.max(1, intervalMinutes) * 60_000 - CRON_JITTER_TOLERANCE_MS;
  return now.getTime() - lastMs >= requiredMs;
}

export interface ShanghaiClockParts {
  dateKey: string;
  hour: number;
  minute: number;
  weekday: string;
}

export function getShanghaiClockParts(now = new Date()): ShanghaiClockParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour12: false,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const rawHour = Number(map.hour ?? 0);
  return {
    dateKey: getAppDateKey(now),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(map.minute ?? 0),
    weekday: map.weekday ?? '',
  };
}

export function isDailyReportDue(
  schedulerEnabled: boolean,
  hasExistingReport: boolean,
  now = new Date(),
): boolean {
  if (!schedulerEnabled || hasExistingReport) return false;
  const { hour } = getShanghaiClockParts(now);
  return hour >= 22;
}

export function isWeeklyReportDue(
  schedulerEnabled: boolean,
  hasExistingReport: boolean,
  now = new Date(),
): boolean {
  if (!schedulerEnabled || hasExistingReport) return false;
  const { weekday, hour, minute } = getShanghaiClockParts(now);
  return weekday === 'Sun' && (hour > 22 || (hour === 22 && minute >= 30));
}

export function isMonthlyReportDue(
  schedulerEnabled: boolean,
  hasExistingReport: boolean,
  now = new Date(),
): boolean {
  if (!schedulerEnabled || hasExistingReport) return false;
  const { dateKey, hour, minute } = getShanghaiClockParts(now);
  return dateKey.endsWith('-01') && (hour > 0 || minute >= 30);
}
