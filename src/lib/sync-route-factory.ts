/**
 * Sync Settings Route Factory — generates GET/POST route handlers
 * for interval-based sync settings endpoints.
 *
 * Eliminates duplication between sms/settings/route.ts and device-info-sync/route.ts.
 */
import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from './api-route';
import { ensureSchedulerStarted } from './scheduler';
import { setSetting } from './settings-store';
import type { SyncStatus } from './interval-scheduler';

export interface SyncSettingsRouteOptions {
  /** Setting key for enabled flag, e.g. 'sms_sync_enabled' */
  enabledKey: string;
  /** Setting key for interval, e.g. 'sms_sync_interval' */
  intervalKey: string;
  minInterval: number;
  maxInterval: number;
  getStatus: () => SyncStatus;
  isValidInterval: (value: unknown) => value is number;
  restart: () => Promise<SyncStatus>;
  /** Fallback error message for GET */
  getErrorMessage: string;
  /** Fallback error message for POST */
  postErrorMessage: string;
}

export function createSyncSettingsRoute(options: SyncSettingsRouteOptions) {
  const {
    enabledKey,
    intervalKey,
    minInterval,
    maxInterval,
    getStatus,
    isValidInterval,
    restart,
    getErrorMessage: getErr,
    postErrorMessage: postErr,
  } = options;

  const GET = withApiHandler(async () => {
    await requireSession();
    ensureDatabase();
    await ensureSchedulerStarted();
    return jsonOk(getStatus());
  }, getErr);

  const POST = withApiHandler(async (request) => {
    await requireSession();
    const body = await parseJsonBody<{ enabled?: boolean; interval?: number }>(request);
    if (typeof body.enabled !== 'boolean' || !isValidInterval(body.interval)) {
      throw new ApiError(
        `同步间隔必须是 ${minInterval} 到 ${maxInterval} 之间的整数分钟`,
        400,
      );
    }

    ensureDatabase();
    setSetting(enabledKey, String(body.enabled));
    setSetting(intervalKey, String(body.interval));

    const sync = await restart();
    return jsonOk({ success: true, sync });
  }, postErr);

  return { GET, POST };
}
