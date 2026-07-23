import {
  jsonOk,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { checkAlerts, collectTrafficData } from '@/lib/scheduler';
import { isCpeConfigured, readNotificationConfig } from '@/lib/settings-store';
import { sendCollectionReport, type CollectionReportData } from '@/lib/notifiers/email';
import { parseTimestampMs } from '@/lib/date-time';
import { getCollectionSnapshot } from '@/lib/repositories/collection-repository';

interface CollectionContext {
  collectionId: number | null;
  collectionSucceeded: boolean;
  collectionError?: string;
  collectedDevices: number;
  alertsTriggered: number;
  startedAt: string;
  snapshot: ReturnType<typeof getCollectionSnapshot>;
}

function buildCollectionReportPayload(ctx: CollectionContext): CollectionReportData {
  const { traffic, run, devices } = ctx.snapshot;
  const completedAt = run?.completedAt || new Date().toISOString();
  const startedTime = new Date(ctx.startedAt).getTime();
  const completedTime = parseTimestampMs(run?.completedAt) ?? Date.now();

  return {
    success: ctx.collectionSucceeded,
    collectionId: ctx.collectionId,
    source: run?.source || 'manual',
    error: ctx.collectionSucceeded ? null : ctx.collectionError || run?.errorMessage || '采集失败',
    collectedDevices: ctx.collectedDevices,
    alertsTriggered: ctx.alertsTriggered,
    trafficDelta: traffic
      ? { uploadBytes: traffic.deltaUploadBytes, downloadBytes: traffic.deltaDownloadBytes }
      : null,
    cumulativeTraffic: traffic
      ? { uploadBytes: traffic.uploadBytes || 0, downloadBytes: traffic.downloadBytes || 0 }
      : null,
    rates: traffic
      ? { uploadBps: traffic.uploadBps || 0, downloadBps: traffic.downloadBps || 0 }
      : null,
    network: traffic
      ? { networkType: traffic.networkType, band: traffic.band, cellId: traffic.cellId, pci: traffic.pci }
      : null,
    signal: traffic
      ? { signalStrength: traffic.signalStrength, rsrp: traffic.rsrp, rsrq: traffic.rsrq, sinr: traffic.sinr, rssi: traffic.rssi }
      : null,
    topDevices: devices,
    collectedAt: ctx.startedAt,
    completedAt,
    durationMs: Math.max(0, completedTime - startedTime),
  };
}

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
  const topDevices = snapshot.devices;
  const trafficDelta = latestTraffic
    ? { uploadBytes: latestTraffic.deltaUploadBytes, downloadBytes: latestTraffic.deltaDownloadBytes }
    : null;

  // Send email report if email notification is configured
  try {
    const emailConfig = readNotificationConfig('email');
    if (emailConfig) {
      void sendCollectionReport(emailConfig, buildCollectionReportPayload({
        collectionId: collection.collectionId,
        collectionSucceeded,
        collectionError: collection.error,
        collectedDevices,
        alertsTriggered,
        startedAt,
        snapshot,
      }));
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
