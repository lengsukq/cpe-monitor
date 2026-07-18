import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export const GET = withApiHandler(async () => {
  await requireSession();
  const client = getOrCreateCpeClient();
  await client.ensureLogin();
  const startDate = await client.getStartDate();
  return jsonOk(startDate);
}, '获取套餐配置失败');
