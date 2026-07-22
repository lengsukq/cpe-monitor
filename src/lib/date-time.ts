export const APP_TIME_ZONE = 'Asia/Shanghai';

const SQLITE_UTC_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
const ISO_WITH_ZONE_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Parses ISO timestamps and SQLite UTC text (`YYYY-MM-DD HH:mm:ss`) consistently.
 */
export function parseDateTime(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (SQLITE_UTC_PATTERN.test(trimmed)) {
    normalized = `${trimmed.replace(' ', 'T')}Z`;
  } else if (!ISO_WITH_ZONE_PATTERN.test(trimmed) && /^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    // Existing persisted application timestamps without a zone are UTC.
    normalized = `${trimmed}Z`;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseTimestampMs(value: string | Date | null | undefined): number | null {
  return parseDateTime(value)?.getTime() ?? null;
}

/** Converts a Date to SQLite's UTC text representation. */
export function toSqliteTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function formatAppDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const date = parseDateTime(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...options,
  }).format(date);
}

export function getAppDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Returns the UTC boundaries for a calendar day in Asia/Shanghai.
 * China Standard Time has no DST, so the offset is stable at UTC+08:00.
 */
export function getAppDayRange(date = new Date()): {
  dateKey: string;
  start: Date;
  end: Date;
} {
  const dateKey = getAppDateKey(date);
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { dateKey, start, end };
}

export function getAppHour(value: string | Date): number | null {
  const date = parseDateTime(value);
  if (!date) return null;
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    hour12: false,
  }).format(date);
  const parsed = Number(hour);
  return Number.isInteger(parsed) ? parsed : null;
}
