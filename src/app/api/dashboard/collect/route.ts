import { db } from '@/lib/db';
import {
  ensureDatabase,
  jsonOk,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';
import { checkAlerts, collectTrafficData } from '@/lib/scheduler';
import { isCpeConfigured, readNotificationConfig } from '@/lib/settings-store';
import { sendCollectionReport } from '@/lib/notifiers/email';
import { parseTimestampMs } from '@/lib/date-time';

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

  const startedAt = new Date().toISOString();
  const collection = await collectTrafficData('manual');
  const collectedDevices = collection.collectedDevices;
  const collectionSucceeded = collection.success;
  // Run alert evaluation after both successful and failed collections so a
  // consecutive-failure rule can notify on manual collection failures too.
  const alertsTriggered = await checkAlerts();

  const latestTraffic = collection.collectionId !== null ? db.prepare(
    `SELECT
       upload_bytes,
       download_bytes,
       delta_upload_bytes,
       delta_download_bytes,
       upload_bps,
       download_bps,
       connected_devices,
       signal_strength,
       network_type,
       band,
       cell_id,
       pci,
       rsrp,
       rsrq,
       sinr,
       rssi,
       timestamp
     FROM traffic_data
     WHERE collection_id = ?
     ORDER BY id DESC
     LIMIT 1`,
  ).get(collection.collectionId) as {
    upload_bytes: number;
    download_bytes: number;
    delta_upload_bytes: number | null;
    delta_download_bytes: number | null;
    upload_bps: number | null;
    download_bps: number | null;
    connected_devices: number;
    signal_strength: number;
    network_type: string | null;
    band: string | null;
    cell_id: string | null;
    pci: string | null;
    rsrp: number | null;
    rsrq: number | null;
    sinr: number | null;
    rssi: number | null;
    timestamp: string;
  } | undefined : undefined;

  const collectionRun = collection.collectionId !== null ? db.prepare(
    `SELECT id, source, status, started_at, completed_at, error_message
     FROM collection_runs
     WHERE id = ?`,
  ).get(collection.collectionId) as {
    id: number;
    source: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    error_message: string | null;
  } | undefined : undefined;

  const trafficDelta = latestTraffic
    ? {
        uploadBytes: latestTraffic.delta_upload_bytes || 0,
        downloadBytes: latestTraffic.delta_download_bytes || 0,
      }
    : null;

  const latestDevices = collection.collectionId !== null ? db.prepare(
    `SELECT
       device_name,
       device_ip,
       device_mac,
       delta_upload_bytes,
       delta_download_bytes,
       upload_bps,
       download_bps,
       interface_type,
       frequency,
       rssi
     FROM device_data
     WHERE collection_id = ?
     ORDER BY (COALESCE(delta_upload_bytes, 0) + COALESCE(delta_download_bytes, 0)) DESC`,
  ).all(collection.collectionId) as {
    device_name: string;
    device_ip: string;
    device_mac: string;
    delta_upload_bytes: number | null;
    delta_download_bytes: number | null;
    upload_bps: number | null;
    download_bps: number | null;
    interface_type: string | null;
    frequency: string | null;
    rssi: number | null;
  }[] : [];

  const topDevices = latestDevices.map((device) => ({
    name: device.device_name || device.device_ip || '未知设备',
    ip: device.device_ip || '',
    mac: device.device_mac || '',
    uploadBytes: device.delta_upload_bytes || 0,
    downloadBytes: device.delta_download_bytes || 0,
    uploadBps: device.upload_bps || 0,
    downloadBps: device.download_bps || 0,
    interfaceType: device.interface_type || '',
    frequency: device.frequency || '',
    rssi: device.rssi,
  }));

  // Send email report if email notification is configured
  try {
    const emailConfig = readNotificationConfig('email');
    if (emailConfig) {
      const completedAt = collectionRun?.completed_at || new Date().toISOString();
      const startedTime = new Date(startedAt).getTime();
      const completedTime = parseTimestampMs(collectionRun?.completed_at) ?? Date.now();
      void sendCollectionReport(emailConfig, {
        success: collectionSucceeded,
        collectionId: collection.collectionId,
        source: collectionRun?.source || 'manual',
        error: collectionSucceeded ? null : collection.error || collectionRun?.error_message || '采集失败',
        collectedDevices,
        alertsTriggered,
        trafficDelta,
        cumulativeTraffic: latestTraffic
          ? {
              uploadBytes: latestTraffic.upload_bytes || 0,
              downloadBytes: latestTraffic.download_bytes || 0,
            }
          : null,
        rates: latestTraffic
          ? {
              uploadBps: latestTraffic.upload_bps || 0,
              downloadBps: latestTraffic.download_bps || 0,
            }
          : null,
        network: latestTraffic
          ? {
              networkType: latestTraffic.network_type,
              band: latestTraffic.band,
              cellId: latestTraffic.cell_id,
              pci: latestTraffic.pci,
            }
          : null,
        signal: latestTraffic
          ? {
              signalStrength: latestTraffic.signal_strength,
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
