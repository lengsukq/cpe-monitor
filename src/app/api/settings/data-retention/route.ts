import {
  ApiError,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import {
  cleanupHistoricalData,
  getDataRetentionConfig,
  isValidRetentionDays,
  saveDataRetentionConfig,
} from '@/lib/data-retention';

interface DataRetentionBody {
  historyDays: number;
  runDays: number;
  cleanupNow?: boolean;
}

export const GET = withApiHandler(async () => {
  await requireSession();
  return jsonOk(getDataRetentionConfig());
}, '获取数据保留设置失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  const body = await parseJsonBody<DataRetentionBody>(request);
  if (!isValidRetentionDays(body.historyDays) || !isValidRetentionDays(body.runDays)) {
    throw new ApiError('保留天数必须是 7 到 3650 之间的整数', 400);
  }

  const config = saveDataRetentionConfig({
    historyDays: body.historyDays,
    runDays: body.runDays,
  });
  const cleanup = body.cleanupNow ? cleanupHistoricalData(true) : null;
  return jsonOk({ config, cleanup });
}, '保存数据保留设置失败');
