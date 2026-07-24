/**
 * Bark iOS push notification notifier.
 * Bark is an iOS app that allows you to send custom notifications to your iPhone.
 * Docs: https://github.com/Finb/Bark
 */
import type { AlertPayload, DailyReportPayload } from './types';

export interface BarkConfig {
  serverUrl: string; // e.g. https://api.day.app or self-hosted
  deviceKey: string; // Your device key
}

export async function sendBarkMessage(config: BarkConfig, title: string, body: string, options?: {
  group?: string;
  level?: 'active' | 'timeSensitive' | 'passive';
  url?: string;
}): Promise<boolean> {
  try {
    const baseUrl = config.serverUrl.replace(/\/$/, '');
    const payload: Record<string, unknown> = {
      title,
      body,
      device_key: config.deviceKey,
      group: options?.group || 'CPE Monitor',
    };
    if (options?.level) payload.level = options.level;
    if (options?.url) payload.url = options.url;

    const resp = await fetch(`${baseUrl}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await resp.json();
    return result.code === 200;
  } catch (error) {
    console.error('Failed to send Bark message:', error);
    return false;
  }
}

export async function sendAlertBark(config: BarkConfig, alert: AlertPayload): Promise<boolean> {
  return sendBarkMessage(
    config,
    `CPE 告警: ${alert.ruleName}`,
    alert.message,
    { level: 'timeSensitive', group: 'CPE 告警' },
  );
}

export async function sendDailyReportBark(config: BarkConfig, report: DailyReportPayload): Promise<boolean> {
  const body = `下载 ${report.totalDownload} / 上传 ${report.totalUpload}
设备 ${report.deviceCount} 台 / 质量 ${report.networkQuality}`;

  return sendBarkMessage(
    config,
    `CPE 日报 ${report.date}`,
    body,
    { level: 'passive', group: 'CPE 日报' },
  );
}
