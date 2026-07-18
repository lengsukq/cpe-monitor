import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { getOrCreateCpeClient } from '@/lib/cpe-client';

export const GET = withApiHandler(async () => {
  await requireSession();
  const client = getOrCreateCpeClient();
  await client.ensureLogin();
  const [stats, monthStatistics] = await Promise.all([
    client.getTrafficStatistics(),
    client.getMonthStatistics(),
  ]);
  return jsonOk({ ...stats, ...monthStatistics });
}, '获取流量统计失败');
