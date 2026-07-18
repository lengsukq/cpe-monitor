import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { resetCpeClient } from '@/lib/cpe-client';
import { getPublicCpeConfig, upsertCpeConfig } from '@/lib/settings-store';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();
  return jsonOk(getPublicCpeConfig());
}, '获取CPE配置失败');

export const POST = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();
  const body = await parseJsonBody<{
    cpeUrl?: string;
    cpeUsername?: string;
    cpePassword?: string;
  }>(request);

  if (!body.cpeUrl || !body.cpeUsername) {
    throw new ApiError('请填写 CPE 地址和用户名', 400);
  }

  try {
    upsertCpeConfig({
      cpeUrl: body.cpeUrl,
      cpeUsername: body.cpeUsername,
      cpePassword: body.cpePassword,
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : '保存CPE配置失败',
      400,
    );
  }

  resetCpeClient();
  return jsonOk({ success: true });
}, '保存CPE配置失败');
