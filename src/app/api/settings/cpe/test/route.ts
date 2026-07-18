import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { CpeClient } from '@/lib/cpe-client';
import {
  DEFAULT_CPE_URL,
  DEFAULT_CPE_USERNAME,
  getCpeConfigRow,
} from '@/lib/settings-store';

export const POST = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();

  const body = await parseJsonBody<{
    cpeUrl?: string;
    cpeUsername?: string;
    cpePassword?: string;
  }>(request);

  const config = getCpeConfigRow();
  const finalUrl = body.cpeUrl || config?.cpe_url || DEFAULT_CPE_URL;
  const finalUsername = body.cpeUsername || config?.cpe_username || DEFAULT_CPE_USERNAME;
  const finalPassword = body.cpePassword || config?.cpe_password_encrypted;

  if (!finalPassword) {
    throw new ApiError('请先输入 CPE 密码', 400);
  }

  // Test with a fresh client (don't use singleton for testing)
  const client = new CpeClient(finalUrl, finalUsername, finalPassword);
  const startTime = Date.now();
  const loginResult = await client.login();
  const latency = Date.now() - startTime;

  if (loginResult) {
    return jsonOk({
      success: true,
      message: 'CPE 连接成功',
      latency: `${latency}ms`,
      deviceUrl: finalUrl,
    });
  }

  return jsonOk({
    success: false,
    message: client.getLastLoginError(),
    latency: `${latency}ms`,
    deviceUrl: finalUrl,
  });
}, 'CPE 连接测试失败');
