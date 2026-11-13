import { getAppDateKey } from './date-time.ts';

export type DataPlanForecastStatus = 'unconfigured' | 'over' | 'will_exceed' | 'warning' | 'healthy';

export interface DataPlanForecast {
  hasLimit: boolean;
  cycleStartDate: string;
  cycleEndDate: string;
  nextResetDate: string;
  totalCycleDays: number;
  elapsedCalendarDays: number;
  remainingCalendarDays: number;
  timeProgressPercent: number;
  usedPercent: number;
  dailyAvgBytes: number;
  dailyBudgetBytes: number;
  projectedTotalBytes: number;
  projectedPercent: number;
  projectedOverBytes: number;
  estimatedExhaustDays: number | null;
  estimatedExhaustDate: string | null;
  status: DataPlanForecastStatus;
}

function parseDateParts(dateKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateKey.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function makeDateKey(year: number, month: number, day: number): string {
  const clamped = Math.min(Math.max(1, day), daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const zeroBased = year * 12 + (month - 1) + delta;
  return {
    year: Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1,
  };
}

function dateKeyToUtcDayMs(dateKey: string): number {
  const { year, month, day } = parseDateParts(dateKey);
  return Date.UTC(year, month - 1, day);
}

export function computeDataPlanForecast(params: {
  usedBytes: number;
  limitBytes: number;
  resetDay?: number;
  warningThresholdPercent?: number;
  now?: Date;
}): DataPlanForecast {
  const now = params.now ?? new Date();
  const usedBytes = Math.max(0, Number.isFinite(params.usedBytes) ? params.usedBytes : 0);
  const limitBytes = Math.max(0, Number.isFinite(params.limitBytes) ? params.limitBytes : 0);
  const resetDay = Math.min(31, Math.max(1, Math.floor(params.resetDay || 1)));
  const warningThreshold = Math.min(100, Math.max(1, Number(params.warningThresholdPercent || 90)));

  const todayKey = getAppDateKey(now);
  const { year, month, day } = parseDateParts(todayKey);
  const thisMonthResetDay = Math.min(resetDay, daysInMonth(year, month));

  let cycleStartDate: string;
  let nextResetDate: string;
  if (day >= thisMonthResetDay) {
    cycleStartDate = makeDateKey(year, month, resetDay);
    const next = addMonths(year, month, 1);
    nextResetDate = makeDateKey(next.year, next.month, resetDay);
  } else {
    const prev = addMonths(year, month, -1);
    cycleStartDate = makeDateKey(prev.year, prev.month, resetDay);
    nextResetDate = makeDateKey(year, month, resetDay);
  }

  const cycleStartUtcDayMs = dateKeyToUtcDayMs(cycleStartDate);
  const nextResetUtcDayMs = dateKeyToUtcDayMs(nextResetDate);
  const todayUtcDayMs = dateKeyToUtcDayMs(todayKey);
  const cycleEndDate = new Date(nextResetUtcDayMs - 86_400_000).toISOString().slice(0, 10);

  const totalCycleDays = Math.max(1, Math.round((nextResetUtcDayMs - cycleStartUtcDayMs) / 86_400_000));
  const elapsedCalendarDays = Math.min(
    totalCycleDays,
    Math.max(1, Math.round((todayUtcDayMs - cycleStartUtcDayMs) / 86_400_000) + 1),
  );
  const remainingCalendarDays = Math.max(0, Math.round((nextResetUtcDayMs - todayUtcDayMs) / 86_400_000));

  const cycleStartMs = new Date(`${cycleStartDate}T00:00:00+08:00`).getTime();
  const nextResetMs = new Date(`${nextResetDate}T00:00:00+08:00`).getTime();
  const totalMs = Math.max(86_400_000, nextResetMs - cycleStartMs);
  const elapsedMs = Math.min(totalMs, Math.max(0, now.getTime() - cycleStartMs));
  const remainingMs = Math.max(0, nextResetMs - now.getTime());

  const timeProgressPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
  const effectiveElapsedDays = Math.min(totalCycleDays, Math.max(1, elapsedMs / 86_400_000));
  const remainingExactDays = remainingMs / 86_400_000;

  const dailyAvgBytes = usedBytes / effectiveElapsedDays;
  const projectedTotalBytes = usedBytes + dailyAvgBytes * remainingExactDays;

  if (limitBytes <= 0) {
    return {
      hasLimit: false,
      cycleStartDate,
      cycleEndDate,
      nextResetDate,
      totalCycleDays,
      elapsedCalendarDays,
      remainingCalendarDays,
      timeProgressPercent,
      usedPercent: 0,
      dailyAvgBytes,
      dailyBudgetBytes: 0,
      projectedTotalBytes,
      projectedPercent: 0,
      projectedOverBytes: 0,
      estimatedExhaustDays: null,
      estimatedExhaustDate: null,
      status: 'unconfigured',
    };
  }

  const usedPercent = (usedBytes / limitBytes) * 100;
  const remainingBytes = Math.max(0, limitBytes - usedBytes);
  const dailyBudgetBytes = remainingBytes > 0
    ? remainingBytes / Math.max(1, remainingExactDays)
    : 0;
  const projectedPercent = (projectedTotalBytes / limitBytes) * 100;
  const projectedOverBytes = Math.max(0, projectedTotalBytes - limitBytes);

  let estimatedExhaustDays: number | null = null;
  let estimatedExhaustDate: string | null = null;
  if (usedBytes < limitBytes && dailyAvgBytes > 0) {
    const daysToExhaust = remainingBytes / dailyAvgBytes;
    if (daysToExhaust <= remainingExactDays) {
      estimatedExhaustDays = daysToExhaust;
      const exhaustMs = now.getTime() + daysToExhaust * 86_400_000;
      estimatedExhaustDate = getAppDateKey(new Date(exhaustMs));
    }
  }

  let status: DataPlanForecastStatus = 'healthy';
  if (usedBytes >= limitBytes) {
    status = 'over';
  } else if (projectedTotalBytes > limitBytes) {
    status = 'will_exceed';
  } else if (usedPercent >= warningThreshold || projectedPercent >= warningThreshold) {
    status = 'warning';
  }

  return {
    hasLimit: true,
    cycleStartDate,
    cycleEndDate,
    nextResetDate,
    totalCycleDays,
    elapsedCalendarDays,
    remainingCalendarDays,
    timeProgressPercent,
    usedPercent,
    dailyAvgBytes,
    dailyBudgetBytes,
    projectedTotalBytes,
    projectedPercent,
    projectedOverBytes,
    estimatedExhaustDays,
    estimatedExhaustDate,
    status,
  };
}
