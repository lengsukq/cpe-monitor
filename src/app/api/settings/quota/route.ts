import { jsonOk, requireSession, withApiHandler, parseJsonBody } from '@/lib/api-route';
import { getSetting, setSetting } from '@/lib/settings-store';
import { initializeDatabase } from '@/lib/db';

export const GET = withApiHandler(async () => {
  await requireSession();
  initializeDatabase();

  return jsonOk({
    enabled: getSetting('data_quota_enabled') === 'true',
    quotaGb: getSetting('data_quota_gb', ''),
    alertLevels: getSetting('data_quota_alert_levels', '80,90,100'),
    resetDay: getSetting('data_quota_reset_day', '1'),
  });
}, '获取配额设置失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  initializeDatabase();

  const body = await parseJsonBody<{
    enabled?: boolean;
    quotaGb?: string;
    alertLevels?: string;
    resetDay?: string;
  }>(request);

  if (body.enabled !== undefined) setSetting('data_quota_enabled', String(body.enabled));
  if (body.quotaGb !== undefined) setSetting('data_quota_gb', body.quotaGb);
  if (body.alertLevels !== undefined) setSetting('data_quota_alert_levels', body.alertLevels);
  if (body.resetDay !== undefined) setSetting('data_quota_reset_day', body.resetDay);

  return jsonOk({ success: true });
}, '保存配额设置失败');
