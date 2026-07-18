import { db } from '@/lib/db';
import {
  ensureDatabase,
  jsonOk,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { getOrCreateCpeClient } from '@/lib/cpe-client';
import { checkAlerts, collectTrafficData } from '@/lib/scheduler';
import { isCpeConfigured, readNotificationConfig } from '@/lib/settings-store';
import { sendCollectionReport } from '@/lib/notifiers/email';

export const POST = withApiHandler(async () => {
  await requireSession();
  ensureDatabase();

  // Unified pre-check: supports both environment variable (CPE_PASSWORD)
  // and database (cpe_config table) configuration.
  if (!isCpeConfigured()) {
    return jsonOk({
      success: false,
      collectedDevices: 0,
      alertsTriggered: 0,
      error: 'CPE 未配置，请在设置页面填写 CPE 地址和密码，或设置 CPE_PASSWORD 环境变量',
      collectedAt: new Date().toISOString(),
    });
  }

  // Verify CPE is reachable and credentials are valid
  try {
    const client = getOrCreateCpeClient();
    await client.ensureLogin();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'CPE 连接失败';
    return jsonOk({
      success: false,
      collectedDevices: 0,
      alertsTriggered: 0,
      error: errorMessage,
      collectedAt: new Date().toISOString(),
    });
  }

  // Proceed with data collection
  const startedAt = new Date().toISOString();
  const collectedDevices = await collectTrafficData();
  const alertsTriggered = await checkAlerts();

  // Fetch current and previous traffic snapshots to compute delta
  const allTraffic = db.prepare(
    'SELECT id, upload_bytes, download_bytes, connected_devices, signal_strength, timestamp FROM traffic_data ORDER BY id DESC LIMIT 2',
  ).all() as { id: number; upload_bytes: number; download_bytes: number; connected_devices: number; signal_strength: number; timestamp: string }[];

  const latestTraffic = allTraffic[0];
  const previousTraffic = allTraffic[1];

  // Compute traffic delta since last collection
  // upload_bytes/download_bytes are CPE cumulative values; the delta
  // represents traffic accumulated between the two collection runs.
  const trafficDelta = latestTraffic && previousTraffic
    ? {
        uploadBytes: Math.max(0, latestTraffic.upload_bytes - previousTraffic.upload_bytes),
        downloadBytes: Math.max(0, latestTraffic.download_bytes - previousTraffic.download_bytes),
      }
    : latestTraffic
      ? { uploadBytes: 0, downloadBytes: 0 }
      : null;

  // Fetch the latest device data that was just collected
  // Use the last insert row id range for reliable matching
  const latestDeviceId = db.prepare(
    'SELECT id FROM device_data ORDER BY id DESC LIMIT 1',
  ).get() as { id: number } | undefined;
  const latestDeviceIdStart = latestDeviceId ? Math.max(1, latestDeviceId.id - 50) : 0;
  const latestDevices = db.prepare(
    'SELECT device_name, device_ip, upload_bytes, download_bytes FROM device_data WHERE id >= ? ORDER BY id DESC',
  ).all(latestDeviceIdStart) as { device_name: string; device_ip: string; upload_bytes: number; download_bytes: number }[];

  const topDevices = latestDevices.map((device) => ({
    name: device.device_name || device.device_ip || '未知设备',
    uploadBytes: device.upload_bytes,
    downloadBytes: device.download_bytes,
  }));

  // Send email report if email notification is configured
  try {
    const emailConfig = readNotificationConfig('email');
    if (emailConfig) {
      const signalStrength = latestTraffic?.signal_strength ?? null;
      void sendCollectionReport(emailConfig, {
        collectedDevices,
        alertsTriggered,
        trafficDelta,
        signalStrength,
        topDevices,
        collectedAt: startedAt,
      });
    }
  } catch (error) {
    // Email failure should not block the collection response
    console.error('Failed to send collection report email:', error);
  }

  return jsonOk({
    success: true,
    collectedDevices,
    alertsTriggered,
    trafficSnapshot: latestTraffic
      ? {
          uploadBytes: latestTraffic.upload_bytes,
          downloadBytes: latestTraffic.download_bytes,
          signalStrength: latestTraffic.signal_strength,
          collectedAt: latestTraffic.timestamp,
        }
      : null,
    trafficDelta,
    topDevices,
    collectedAt: startedAt,
  });
}, '采集失败');
