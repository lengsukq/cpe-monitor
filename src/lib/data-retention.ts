import { db, ensureDatabaseReady, toSqliteTimestamp } from '@/lib/db';
import { getSetting, setSetting } from '@/lib/settings-store';

export const RETENTION_MIN_DAYS = 7;
export const RETENTION_MAX_DAYS = 3650;
export const DEFAULT_HISTORY_RETENTION_DAYS = 90;
export const DEFAULT_RUN_RETENTION_DAYS = 180;
const CLEANUP_INTERVAL_MS = 12 * 60 * 60 * 1000;

export interface DataRetentionConfig {
  historyDays: number;
  runDays: number;
  lastCleanupAt: string | null;
}

export interface DataCleanupResult {
  skipped: boolean;
  trafficDeleted: number;
  devicesDeleted: number;
  runsDeleted: number;
  cleanedAt: string;
}

function clampRetentionDays(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(RETENTION_MAX_DAYS, Math.max(RETENTION_MIN_DAYS, parsed));
}

function parseStoredDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDataRetentionConfig(): DataRetentionConfig {
  ensureDatabaseReady();
  return {
    historyDays: clampRetentionDays(
      getSetting('history_retention_days', String(DEFAULT_HISTORY_RETENTION_DAYS)),
      DEFAULT_HISTORY_RETENTION_DAYS,
    ),
    runDays: clampRetentionDays(
      getSetting('collection_run_retention_days', String(DEFAULT_RUN_RETENTION_DAYS)),
      DEFAULT_RUN_RETENTION_DAYS,
    ),
    lastCleanupAt: getSetting('history_last_cleanup_at', '') || null,
  };
}

export function isValidRetentionDays(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= RETENTION_MIN_DAYS
    && value <= RETENTION_MAX_DAYS;
}

export function saveDataRetentionConfig(input: {
  historyDays: number;
  runDays: number;
}): DataRetentionConfig {
  if (!isValidRetentionDays(input.historyDays) || !isValidRetentionDays(input.runDays)) {
    throw new Error(`保留天数必须是 ${RETENTION_MIN_DAYS} 到 ${RETENTION_MAX_DAYS} 之间的整数`);
  }
  setSetting('history_retention_days', String(input.historyDays));
  setSetting('collection_run_retention_days', String(input.runDays));
  return getDataRetentionConfig();
}

export function cleanupHistoricalData(force = false): DataCleanupResult {
  ensureDatabaseReady();
  const config = getDataRetentionConfig();
  const now = new Date();
  const lastCleanupTime = parseStoredDate(config.lastCleanupAt);

  if (
    !force
    && lastCleanupTime !== null
    && now.getTime() - lastCleanupTime < CLEANUP_INTERVAL_MS
  ) {
    return {
      skipped: true,
      trafficDeleted: 0,
      devicesDeleted: 0,
      runsDeleted: 0,
      cleanedAt: config.lastCleanupAt || now.toISOString(),
    };
  }

  const historyCutoff = toSqliteTimestamp(
    new Date(now.getTime() - config.historyDays * 24 * 60 * 60 * 1000),
  );
  const runCutoff = toSqliteTimestamp(
    new Date(now.getTime() - config.runDays * 24 * 60 * 60 * 1000),
  );

  const cleanup = db.transaction(() => {
    const devices = db.prepare(
      'DELETE FROM device_data WHERE timestamp < ?',
    ).run(historyCutoff);
    const traffic = db.prepare(
      'DELETE FROM traffic_data WHERE timestamp < ?',
    ).run(historyCutoff);
    const runs = db.prepare(
      `DELETE FROM collection_runs
       WHERE COALESCE(completed_at, started_at) < ?
         AND NOT EXISTS (
           SELECT 1 FROM traffic_data WHERE traffic_data.collection_id = collection_runs.id
         )
         AND NOT EXISTS (
           SELECT 1 FROM device_data WHERE device_data.collection_id = collection_runs.id
         )`,
    ).run(runCutoff);

    return {
      devicesDeleted: Number(devices.changes || 0),
      trafficDeleted: Number(traffic.changes || 0),
      runsDeleted: Number(runs.changes || 0),
    };
  });

  const deleted = cleanup();
  const cleanedAt = now.toISOString();
  setSetting('history_last_cleanup_at', cleanedAt);
  return {
    skipped: false,
    ...deleted,
    cleanedAt,
  };
}
