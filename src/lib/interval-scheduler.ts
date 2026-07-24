/**
 * IntervalScheduler — generic factory for periodic sync schedulers.
 *
 * Eliminates duplication between sms-sync-scheduler and device-info-sync-scheduler
 * by encapsulating the shared scheduling lifecycle:
 * - Interval validation & clamping
 * - Status reporting (enabled, interval, running, lastSyncedAt, lastError)
 * - Start / stop / restart / ensureStarted lifecycle
 * - Singleton promise deduplication for concurrent sync calls
 * - Metadata persistence (lastSyncedAt, lastError) via settings-store
 */
import { initializeDatabase } from './db';
import { getSettingsMap, setSetting } from './settings-store';
import { getErrorMessage } from './error-utils';

export interface SyncStatus {
  enabled: boolean;
  interval: number;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface IntervalSchedulerOptions {
  /** Human-readable name for logging, e.g. 'SMS sync' */
  name: string;
  /** Settings key prefix, e.g. 'sms' → sms_sync_enabled, sms_sync_interval, sms_last_sync_at, sms_last_sync_error */
  settingPrefix: string;
  defaultInterval: number;
  minInterval: number;
  maxInterval: number;
  /** The actual sync task to execute */
  task: (source: 'scheduler' | 'manual') => Promise<unknown>;
}

export interface IntervalScheduler {
  getStatus(): SyncStatus;
  isValidInterval(value: unknown): value is number;
  restart(): Promise<SyncStatus>;
  stop(): void;
  ensureStarted(): Promise<void>;
  sync(source?: 'scheduler' | 'manual'): Promise<unknown>;
  readonly minInterval: number;
  readonly maxInterval: number;
  readonly defaultInterval: number;
}

export function createIntervalScheduler(options: IntervalSchedulerOptions): IntervalScheduler {
  const {
    name,
    settingPrefix,
    defaultInterval,
    minInterval,
    maxInterval,
    task,
  } = options;

  let timerTask: ReturnType<typeof setInterval> | null = null;
  let pendingPromise: Promise<unknown> | null = null;

  const enabledKey = `${settingPrefix}_sync_enabled`;
  const intervalKey = `${settingPrefix}_sync_interval`;
  const lastSyncAtKey = `${settingPrefix}_last_sync_at`;
  const lastSyncErrorKey = `${settingPrefix}_last_sync_error`;

  function parseInterval(value: string | undefined): number {
    const interval = Number(value || defaultInterval);
    if (!Number.isInteger(interval)) return defaultInterval;
    return Math.min(maxInterval, Math.max(minInterval, interval));
  }

  function updateMetadata(lastSyncedAt: string | null, lastError: string | null): void {
    if (lastSyncedAt !== null) setSetting(lastSyncAtKey, lastSyncedAt);
    if (lastError !== null) setSetting(lastSyncErrorKey, lastError);
  }

  function getStatus(): SyncStatus {
    initializeDatabase();
    const settings = getSettingsMap();
    return {
      enabled: settings[enabledKey] !== 'false',
      interval: parseInterval(settings[intervalKey]),
      running: timerTask !== null,
      lastSyncedAt: settings[lastSyncAtKey] || null,
      lastError: settings[lastSyncErrorKey] || null,
    };
  }

  function isValidInterval(value: unknown): value is number {
    return typeof value === 'number'
      && Number.isInteger(value)
      && value >= minInterval
      && value <= maxInterval;
  }

  async function runScheduled(): Promise<void> {
    try {
      await sync('scheduler');
    } catch (error) {
      console.error(`Failed to run scheduled ${name}:`, error);
    }
  }

  async function restart(): Promise<SyncStatus> {
    initializeDatabase();
    stop();

    const status = getStatus();
    if (!status.enabled) {
      console.log(`${name} scheduler is disabled`);
      return status;
    }

    timerTask = setInterval(() => {
      void runScheduled();
    }, status.interval * 60 * 1000);

    console.log(`${name} scheduler started with interval: ${status.interval} minutes`);
    void runScheduled();
    return getStatus();
  }

  function stop(): void {
    if (timerTask) {
      clearInterval(timerTask);
      timerTask = null;
    }
  }

  async function ensureStarted(): Promise<void> {
    const status = getStatus();
    if (status.enabled && !status.running) {
      await restart();
    } else if (!status.enabled && status.running) {
      stop();
    }
  }

  async function sync(source: 'scheduler' | 'manual' = 'scheduler'): Promise<unknown> {
    if (pendingPromise) return pendingPromise;

    const taskPromise = executeTask(source);
    pendingPromise = taskPromise;
    try {
      return await taskPromise;
    } finally {
      if (pendingPromise === taskPromise) pendingPromise = null;
    }
  }

  async function executeTask(source: 'scheduler' | 'manual'): Promise<unknown> {
    try {
      initializeDatabase();
      const result = await task(source);
      updateMetadata(new Date().toISOString(), '');
      return result;
    } catch (error) {
      updateMetadata(null, getErrorMessage(error, `${name}失败`));
      throw error;
    }
  }

  return {
    getStatus,
    isValidInterval,
    restart,
    stop,
    ensureStarted,
    sync,
    minInterval,
    maxInterval,
    defaultInterval,
  };
}
