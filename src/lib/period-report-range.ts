import { getAppDateKey } from './date-time.ts';

export type PeriodReportType = 'weekly' | 'monthly';
export type PeriodReportScope = 'current' | 'previous';

export interface PeriodDateRange {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
  key: string;
}

function parseDateKeyParts(dateKey: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  return {
    year: Number(yearStr),
    month: Number(monthStr),
    day: Number(dayStr),
  };
}

function formatUtcCalendarKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shanghaiDayStart(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+08:00`);
}

export function getWeekRange(now = new Date()): PeriodDateRange {
  const { year, month, day } = parseDateKeyParts(getAppDateKey(now));
  const currentUtc = new Date(Date.UTC(year, month - 1, day));
  const weekday = currentUtc.getUTCDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = weekday === 0 ? 6 : weekday - 1;

  const mondayUtc = new Date(Date.UTC(year, month - 1, day - diffToMonday));
  const sundayUtc = new Date(Date.UTC(year, month - 1, day - diffToMonday + 6));
  const nextMondayUtc = new Date(Date.UTC(year, month - 1, day - diffToMonday + 7));

  const mondayYear = mondayUtc.getUTCFullYear();
  const jan1Utc = new Date(Date.UTC(mondayYear, 0, 1));
  const weekNum = Math.ceil(
    ((mondayUtc.getTime() - jan1Utc.getTime()) / 86_400_000 + jan1Utc.getUTCDay() + 1) / 7,
  );

  const startDate = formatUtcCalendarKey(mondayUtc);
  const endDate = formatUtcCalendarKey(sundayUtc);
  const nextStartDate = formatUtcCalendarKey(nextMondayUtc);

  return {
    start: shanghaiDayStart(startDate),
    end: shanghaiDayStart(nextStartDate),
    startDate,
    endDate,
    key: `${mondayYear}-W${String(weekNum).padStart(2, '0')}`,
  };
}

export function getPreviousWeekRange(now = new Date()): PeriodDateRange {
  const anchor = new Date(`${getAppDateKey(now)}T12:00:00+08:00`);
  return getWeekRange(new Date(anchor.getTime() - 7 * 86_400_000));
}

export function getMonthRange(now = new Date()): PeriodDateRange {
  const { year, month } = parseDateKeyParts(getAppDateKey(now));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const mm = String(month).padStart(2, '0');
  const startDate = `${year}-${mm}-01`;
  const endDate = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;
  const nextStartDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  return {
    start: shanghaiDayStart(startDate),
    end: shanghaiDayStart(nextStartDate),
    startDate,
    endDate,
    key: `${year}-${mm}`,
  };
}

export function getPreviousMonthRange(now = new Date()): PeriodDateRange {
  const { year, month } = parseDateKeyParts(getAppDateKey(now));
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return getMonthRange(new Date(`${prevYear}-${String(prevMonth).padStart(2, '0')}-15T12:00:00+08:00`));
}

export function getPeriodRangeByScope(
  periodType: PeriodReportType,
  scope: PeriodReportScope,
  now = new Date(),
): PeriodDateRange {
  if (periodType === 'weekly') {
    return scope === 'current' ? getWeekRange(now) : getPreviousWeekRange(now);
  }
  return scope === 'current' ? getMonthRange(now) : getPreviousMonthRange(now);
}

export function resolvePeriodDateRange(
  periodType: PeriodReportType,
  periodKey: string,
): PeriodDateRange | null {
  const trimmed = periodKey.trim();

  if (periodType === 'monthly') {
    const match = /^(\d{4})-(\d{2})$/.exec(trimmed);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    return getMonthRange(new Date(`${year}-${String(month).padStart(2, '0')}-15T12:00:00+08:00`));
  }

  const weekMatch = /^(\d{4})-W(\d{2})$/.exec(trimmed);
  if (!weekMatch) return null;
  const targetYear = Number(weekMatch[1]);
  const jan1Noon = new Date(`${targetYear}-01-01T12:00:00+08:00`);

  for (let offset = 0; offset <= 54; offset += 1) {
    const candidate = getWeekRange(new Date(jan1Noon.getTime() + offset * 7 * 86_400_000));
    if (candidate.key === trimmed) {
      return candidate;
    }
  }
  return null;
}

export function enumerateDateKeys(startDate: string, endDate: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return [];
  }
  const start = parseDateKeyParts(startDate);
  const end = parseDateKeyParts(endDate);
  let cursor = Date.UTC(start.year, start.month - 1, start.day);
  const endMs = Date.UTC(end.year, end.month - 1, end.day);
  if (cursor > endMs) return [];

  const keys: string[] = [];
  while (cursor <= endMs && keys.length < 62) {
    keys.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return keys;
}
