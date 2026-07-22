import { jsonOk, requireSession, withApiHandler } from '@/lib/api-route';
import { ensureSchedulerStarted, getSchedulerStatus } from '@/lib/scheduler';
import { getOrCreateCpeClient } from '@/lib/cpe-client';
import { getSettingsMap } from '@/lib/settings-store';
import { getCollectionHealth } from '@/lib/collection-health';
import { findLatestTrafficOverview } from '@/lib/repositories/monitoring-repository';

export const GET = withApiHandler(async () => {
  await requireSession();
  await ensureSchedulerStarted();

  let settingsMap: Record<string, string> = {};
  try {
    settingsMap = getSettingsMap();
  } catch (error) {
    console.warn('Failed to fetch settings:', error);
  }

  const schedulerStatus = {
    enabled: settingsMap.scheduler_enabled === 'true',
    interval: parseInt(settingsMap.scheduler_interval || '60', 10),
    running: getSchedulerStatus().running,
  };
  const collectionHealth = getCollectionHealth({
    schedulerEnabled: schedulerStatus.enabled,
    intervalMinutes: schedulerStatus.interval,
  });

  let currentUpload = 0;
  let currentDownload = 0;
  let connectedDevices = 0;
  let signalStrength = 0;
  let connectionStatus = 'unknown';
  let updateState = 'unknown';
  let networkType = 'unknown';
  let networkSnapshot: Record<string, unknown> | null = null;
  let source: 'cpe' | 'database' = 'database';
  let cpeError = '';

  try {
    const client = getOrCreateCpeClient();
    await client.ensureLogin();

    const [trafficStats, snapshot, hostInfo] = await Promise.all([
      client.getTrafficStatistics(),
      client.getNetworkSnapshot(),
      client.getHostInfo(),
    ]);
    networkSnapshot = snapshot as Record<string, unknown>;

    currentUpload = parseInt(String(trafficStats.CurrentUploadRate || '0'), 10);
    currentDownload = parseInt(String(trafficStats.CurrentDownloadRate || '0'), 10);
    connectedDevices = hostInfo?.devices?.filter((device: { online?: boolean }) => device.online).length || 0;
    connectionStatus = snapshot?.connectionStatus || 'unknown';
    const deviceState = await client.getOnlineState();
    updateState = String(deviceState.UpdateState || deviceState.upgState || 'unknown');
    networkType = snapshot?.networkType || 'unknown';
    source = 'cpe';
    signalStrength = snapshot?.signalStrength || 0;
  } catch (error) {
    cpeError = error instanceof Error
      ? error.message
      : 'CPE 登录失败，请检查设备地址、网络连接和密码。';
    try {
      const latestTraffic = findLatestTrafficOverview();
      if (latestTraffic) {
        currentUpload = latestTraffic.upload_bytes || 0;
        currentDownload = latestTraffic.download_bytes || 0;
        connectedDevices = latestTraffic.connected_devices || 0;
        signalStrength = latestTraffic.signal_strength || 0;
      }
    } catch (fallbackError) {
      console.error('Overview database fallback failed', fallbackError);
    }
  }

  return jsonOk({
    currentUpload,
    currentDownload,
    connectedDevices,
    signalStrength,
    connectionStatus,
    updateState,
    networkType,
    networkSnapshot,
    source,
    cpeError,
    schedulerStatus,
    collectionHealth,
  });
}, '获取仪表盘概览失败');
