import {
  jsonOk,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { checkAlerts, collectTrafficData } from '@/lib/scheduler';
import { isCpeConfigured, readNotificationConfig } from '@/lib/settings-store';
import { sendCollectionReport } from '@/lib/notifiers/email';
import { parseTimestampMs } from '@/lib/date-time';
import { getCollectionSnapshot } from '@/lib/repositories/collection-repository';

export const POST = withApiHandler(async () => {
  await requireSession();
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

  const startedAt = new Date().toISOString();
  const collection = await collectTrafficData('manual');
  const collectedDevices = collection.collectedDevices;
  const collectionSucceeded = collection.success;
  // Run alert evaluation after both successful and failed collections so a
  // consecutive-failure rule can notify on manual collection failures too.
  const alertsTriggered = await checkAlerts();

  const snapshot = collection.collectionId !== null
    ? getCollectionSnapshot(collection.collectionId)
    : { traffic: null, run: null, devices: [] };
  const latestTraffic = snapshot.traffic;
  const collectionRun = snapshot.run;
  const topDevices = snapshot.devices;
  const trafficDelta = latestTraffic
    ? { uploadBytes: latestTraffic.deltaUploadBytes, downloadBytes: latestTraffic.deltaDownloadBytes }
    : null;

  // Send email report if email notification is configured
  try {
    const emailConfig = readNotificationConfig('email');
    if (emailConfig) {
      const completedAt = collectionRun?.completedAt || new Date().toISOString();
      const startedTime = new Date(startedAt).getTime();
      const completedTime = parseTimestampMs(collectionRun?.completedAt) ?? Date.now();
      void sendCollectionReport(emailConfig, {
        success: collectionSucceeded,
        collectionId: collection.collectionId,
        source: collectionRun?.source || 'manual',
        error: collectionSucceeded ? null : collection.error || collectionRun?.errorMessage || '采集失败',
        collectedDevices,
        alertsTriggered,
        trafficDelta,
        cumulativeTraffic: latestTraffic
          ? {
              uploadBytes: latestTraffic.uploadBytes || 0,
              downloadBytes: latestTraffic.downloadBytes || 0,
            }
          : null,
        rates: latestTraffic
          ? {
              uploadBps: latestTraffic.uploadBps || 0,
              downloadBps: latestTraffic.downloadBps || 0,
            }
          : null,
        network: latestTraffic
          ? {
              networkType: latestTraffic.networkType,
              band: latestTraffic.band,
              cellId: latestTraffic.cellId,
              pci: latestTraffic.pci,
            }
          : null,
        signal: latestTraffic
          ? {
              signalStrength: latestTraffic.signalStrength,
              rsrp: latestTraffic.rsrp,
              rsrq: latestTraffic.rsrq,
              sinr: latestTraffic.sinr,
              rssi: latestTraffic.rssi,
            }
          : null,
        topDevices,
        collectedAt: startedAt,
        completedAt,
        durationMs: Math.max(0, completedTime - startedTime),
      });
    }
  } catch (error) {
    // Email failure should not block the collection response
    console.error('Failed to send collection report email:', error);
  }

  return jsonOk({
    success: collectionSucceeded,
    collectedDevices,
    alertsTriggered,
    error: collectionSucceeded ? undefined : collection.error || '采集失败',
    trafficSnapshot: latestTraffic
      ? {
          uploadBytes: latestTraffic.uploadBytes,
          downloadBytes: latestTraffic.downloadBytes,
          signalStrength: latestTraffic.signalStrength,
          collectedAt: latestTraffic.timestamp,
        }
      : null,
    trafficDelta,
    topDevices,
    collectedAt: startedAt,
  });
}, '采集失败');
