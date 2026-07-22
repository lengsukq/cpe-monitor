import { db } from './db';
import { getOrCreateCpeClient } from './cpe-client';
import { isCpeConfigured } from './settings-store';
import { cleanupHistoricalData } from './data-retention';
import { parseTimestampMs, toSqliteTimestamp } from './date-time';
import {
  bitsPerSecondFromByteDelta,
  computeCounterDelta,
} from './traffic-units';

function getCollectionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '流量采集失败';
}

interface PreviousTrafficSample {
  timestamp: string;
  upload_bytes: number | null;
  download_bytes: number | null;
}

interface PreviousDeviceSample {
  timestamp: string;
  upload_bytes: number | null;
  download_bytes: number | null;
}

export interface TrafficCollectionResult {
  collectionId: number | null;
  collectedDevices: number;
  success: boolean;
  error?: string;
}

export async function collectTrafficData(
  source: 'scheduler' | 'manual' = 'scheduler',
): Promise<TrafficCollectionResult> {
  let collectionId: number | null = null;
  try {
    if (!isCpeConfigured()) {
      console.log('No CPE config found');
      return {
        collectionId: null,
        collectedDevices: 0,
        success: false,
        error: 'CPE 未配置',
      };
    }

    const collectionResult = db.prepare(
      `INSERT INTO collection_runs (source, status)
       VALUES (?, 'running')`,
    ).run(source);
    collectionId = Number(collectionResult.lastInsertRowid);

    const client = getOrCreateCpeClient();
    const trafficInfo = await client.getTrafficData();
    const collectedAt = new Date();
    const collectedAtText = toSqliteTimestamp(collectedAt);
    const previousTraffic = db.prepare(
      `SELECT timestamp, upload_bytes, download_bytes
       FROM traffic_data
       ORDER BY id DESC
       LIMIT 1`,
    ).get() as PreviousTrafficSample | undefined;
    const previousTrafficTime = parseTimestampMs(previousTraffic?.timestamp);
    const elapsedSeconds = previousTrafficTime === null
      ? 0
      : Math.max(0, (collectedAt.getTime() - previousTrafficTime) / 1000);
    const deltaUploadBytes = computeCounterDelta(
      trafficInfo.uploadBytes,
      previousTraffic?.upload_bytes,
    );
    const deltaDownloadBytes = computeCounterDelta(
      trafficInfo.downloadBytes,
      previousTraffic?.download_bytes,
    );

    const insertTraffic = db.prepare(
      `INSERT INTO traffic_data (
        collection_id, timestamp,
        upload_bytes, download_bytes,
        delta_upload_bytes, delta_download_bytes,
        upload_bps, download_bps,
        connected_devices, signal_strength,
        network_type, band, cell_id, pci,
        rsrp, rsrq, sinr, rssi
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const findPreviousDevice = db.prepare(
      `SELECT timestamp, upload_bytes, download_bytes
       FROM device_data
       WHERE device_mac = ?
       ORDER BY id DESC
       LIMIT 1`,
    );
    const insertDevice = db.prepare(
      `INSERT INTO device_data (
        collection_id, timestamp,
        device_name, device_ip, device_mac,
        upload_bytes, download_bytes,
        delta_upload_bytes, delta_download_bytes,
        upload_bps, download_bps,
        online_duration, active,
        interface_type, frequency, rssi, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const persistCollection = db.transaction(() => {
      insertTraffic.run(
        collectionId,
        collectedAtText,
        trafficInfo.uploadBytes,
        trafficInfo.downloadBytes,
        deltaUploadBytes,
        deltaDownloadBytes,
        bitsPerSecondFromByteDelta(deltaUploadBytes, elapsedSeconds),
        bitsPerSecondFromByteDelta(deltaDownloadBytes, elapsedSeconds),
        trafficInfo.connectedDevices,
        trafficInfo.signalStrength,
        trafficInfo.networkType,
        trafficInfo.band,
        trafficInfo.cellId,
        trafficInfo.pci,
        trafficInfo.rsrp,
        trafficInfo.rsrq,
        trafficInfo.sinr,
        trafficInfo.rssi,
      );

      for (const device of trafficInfo.devices) {
        const previousDevice = device.mac
          ? findPreviousDevice.get(device.mac) as PreviousDeviceSample | undefined
          : undefined;
        const previousDeviceTime = parseTimestampMs(previousDevice?.timestamp);
        const deviceElapsedSeconds = previousDeviceTime === null
          ? 0
          : Math.max(0, (collectedAt.getTime() - previousDeviceTime) / 1000);
        const deviceDeltaUpload = computeCounterDelta(
          device.uploadBytes,
          previousDevice?.upload_bytes,
        );
        const deviceDeltaDownload = computeCounterDelta(
          device.downloadBytes,
          previousDevice?.download_bytes,
        );

        insertDevice.run(
          collectionId,
          collectedAtText,
          device.name,
          device.ip,
          device.mac,
          device.uploadBytes,
          device.downloadBytes,
          deviceDeltaUpload,
          deviceDeltaDownload,
          bitsPerSecondFromByteDelta(deviceDeltaUpload, deviceElapsedSeconds),
          bitsPerSecondFromByteDelta(deviceDeltaDownload, deviceElapsedSeconds),
          device.onlineDuration,
          device.online ? 1 : 0,
          device.interfaceType,
          device.frequency,
          device.rssi,
          JSON.stringify(device.raw),
        );
      }

      db.prepare(
        `UPDATE collection_runs
         SET completed_at = ?, status = 'success', connected_devices = ?
         WHERE id = ?`,
      ).run(collectedAtText, trafficInfo.connectedDevices, collectionId);
    });
    persistCollection();

    try {
      const cleanup = cleanupHistoricalData();
      if (!cleanup.skipped) {
        console.log(
          `Historical cleanup: traffic=${cleanup.trafficDeleted}, devices=${cleanup.devicesDeleted}, runs=${cleanup.runsDeleted}`,
        );
      }
    } catch (cleanupError) {
      console.error('Historical cleanup failed:', cleanupError);
    }

    console.log(`Collected traffic data: ${trafficInfo.connectedDevices} devices`);
    return {
      collectionId,
      collectedDevices: trafficInfo.connectedDevices,
      success: true,
    };
  } catch (error) {
    const errorMessage = getCollectionErrorMessage(error);
    if (collectionId !== null) {
      try {
        db.prepare(
          `UPDATE collection_runs
           SET completed_at = datetime('now'), status = 'failed', error_message = ?
           WHERE id = ?`,
        ).run(errorMessage, collectionId);
      } catch (updateError) {
        console.error('Failed to update collection failure state:', updateError);
      }
    }
    console.error('Failed to collect traffic data:', error);
    return {
      collectionId,
      collectedDevices: 0,
      success: false,
      error: errorMessage,
    };
  }
}

