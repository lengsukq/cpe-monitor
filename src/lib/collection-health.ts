import { db, ensureDatabaseReady } from '@/lib/db';

export type CollectionHealthStatus = 'healthy' | 'failed' | 'stale' | 'never' | 'disabled';

export interface CollectionHealth {
  status: CollectionHealthStatus;
  label: string;
  detail: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  staleAfterMinutes: number;
  ageMinutes: number | null;
}

interface CollectionRunRow {
  id: number;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  error_message: string | null;
}

function parseSqliteTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(`${value.replace(' ', 'T')}Z`).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function getRunTime(row: CollectionRunRow | undefined): string | null {
  return row?.completed_at || row?.started_at || null;
}

function countConsecutiveFailures(rows: CollectionRunRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.status !== 'failed') break;
    count += 1;
  }
  return count;
}

export function getCollectionHealth(input: {
  schedulerEnabled: boolean;
  intervalMinutes: number;
  now?: Date;
}): CollectionHealth {
  ensureDatabaseReady();
  const now = input.now || new Date();
  const intervalMinutes = Number.isFinite(input.intervalMinutes) && input.intervalMinutes > 0
    ? input.intervalMinutes
    : 60;
  const staleAfterMinutes = Math.max(15, Math.ceil(intervalMinutes * 2.5));

  const recentRuns = db.prepare(
    `SELECT id, started_at, completed_at, status, error_message
     FROM collection_runs
     ORDER BY id DESC
     LIMIT 20`,
  ).all() as CollectionRunRow[];
  const latestRun = recentRuns[0];
  const latestSuccess = db.prepare(
    `SELECT id, started_at, completed_at, status, error_message
     FROM collection_runs
     WHERE status = 'success'
     ORDER BY id DESC
     LIMIT 1`,
  ).get() as CollectionRunRow | undefined;

  const lastRunAt = getRunTime(latestRun);
  const lastSuccessAt = getRunTime(latestSuccess);
  const lastSuccessTime = parseSqliteTimestamp(lastSuccessAt);
  const ageMinutes = lastSuccessTime === null
    ? null
    : Math.max(0, Math.floor((now.getTime() - lastSuccessTime) / 60_000));
  const consecutiveFailures = countConsecutiveFailures(recentRuns);

  if (latestRun?.status === 'failed') {
    return {
      status: 'failed',
      label: '最近采集失败',
      detail: latestRun.error_message || '最近一次采集未成功',
      lastRunAt,
      lastSuccessAt,
      lastError: latestRun.error_message,
      consecutiveFailures,
      staleAfterMinutes,
      ageMinutes,
    };
  }

  if (!latestSuccess) {
    return {
      status: input.schedulerEnabled ? 'never' : 'disabled',
      label: input.schedulerEnabled ? '等待首次采集' : '定时采集未启用',
      detail: input.schedulerEnabled
        ? '尚无成功采集记录'
        : '可手动采集或开启定时采集',
      lastRunAt,
      lastSuccessAt: null,
      lastError: latestRun?.error_message || null,
      consecutiveFailures,
      staleAfterMinutes,
      ageMinutes: null,
    };
  }

  if (input.schedulerEnabled && ageMinutes !== null && ageMinutes > staleAfterMinutes) {
    return {
      status: 'stale',
      label: '采集数据已过期',
      detail: `距离上次成功采集已 ${ageMinutes} 分钟`,
      lastRunAt,
      lastSuccessAt,
      lastError: null,
      consecutiveFailures,
      staleAfterMinutes,
      ageMinutes,
    };
  }

  if (!input.schedulerEnabled) {
    return {
      status: 'disabled',
      label: '定时采集未启用',
      detail: ageMinutes === null
        ? '暂无成功采集记录'
        : `最近成功采集于 ${ageMinutes} 分钟前`,
      lastRunAt,
      lastSuccessAt,
      lastError: null,
      consecutiveFailures,
      staleAfterMinutes,
      ageMinutes,
    };
  }

  return {
    status: 'healthy',
    label: '采集正常',
    detail: ageMinutes === null ? '最近采集成功' : `${ageMinutes} 分钟前采集成功`,
    lastRunAt,
    lastSuccessAt,
    lastError: null,
    consecutiveFailures,
    staleAfterMinutes,
    ageMinutes,
  };
}
