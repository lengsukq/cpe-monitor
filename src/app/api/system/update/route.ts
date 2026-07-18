import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export const GET = withApiHandler(async () => {
  await requireSession();
  const client = getOrCreateCpeClient();
  await client.ensureLogin();
  const onlineState = await client.getOnlineState();

  return jsonOk({
    updateState: onlineState?.UpdateState || onlineState?.upgState || 'unknown',
    connectionStatus: onlineState?.ConnectionStatus || 'unknown',
    raw: onlineState,
  });
}, '获取升级状态失败');

export const POST = withApiHandler(async () => {
  await requireSession();
  const client = getOrCreateCpeClient();
  await client.ensureLogin();
  const result = await client.checkOnlineUpgrade();
  const onlineState = await client.getOnlineState().catch((error) => {
    console.error('Failed to refresh online state after upgrade check', error);
    return null;
  });

  return jsonOk({
    success: true,
    message: '已触发系统更新检查',
    result,
    updateState: onlineState?.UpdateState || onlineState?.upgState || 'unknown',
  });
}, '检查更新失败');
