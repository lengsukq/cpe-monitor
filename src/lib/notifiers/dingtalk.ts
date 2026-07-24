/**
 * DingTalk (钉钉) custom robot webhook notifier.
 * Docs: https://open.dingtalk.com/document/orgapp/custom-robot-access
 */

export interface DingtalkConfig {
  webhookUrl: string;
  secret?: string; // Optional: for signed mode
}

async function buildSignedUrl(webhookUrl: string, secret: string): Promise<string> {
  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign));
  const sign = encodeURIComponent(btoa(String.fromCharCode(...new Uint8Array(signature))));
  return `${webhookUrl}&timestamp=${timestamp}&sign=${sign}`;
}

export async function sendDingtalkMessage(config: DingtalkConfig, title: string, text: string): Promise<boolean> {
  try {
    const url = config.secret
      ? await buildSignedUrl(config.webhookUrl, config.secret)
      : config.webhookUrl;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: { title, text },
      }),
    });
    const result = await resp.json();
    return result.errcode === 0;
  } catch (error) {
    console.error('Failed to send DingTalk message:', error);
    return false;
  }
}

export async function sendAlertDingtalk(config: DingtalkConfig, alert: {
  ruleName: string;
  message: string;
  timestamp: string;
}): Promise<boolean> {
  const text = `## CPE 告警通知

### ${alert.ruleName}

**时间**: ${alert.timestamp}

**详情**: ${alert.message}

---
> 请及时检查设备状态`;

  return sendDingtalkMessage(config, 'CPE 告警', text);
}

export async function sendDailyReportDingtalk(config: DingtalkConfig, report: {
  date: string;
  totalDownload: string;
  totalUpload: string;
  deviceCount: number;
  networkQuality: string;
  avgSignal: number;
}): Promise<boolean> {
  const text = `## CPE 流量日报 - ${report.date}

### 今日概览
- **总下载**: ${report.totalDownload}
- **总上传**: ${report.totalUpload}
- **在线设备**: ${report.deviceCount} 台

### 网络质量
- **评级**: ${report.networkQuality}
- **平均信号**: ${report.avgSignal} dBm

---
> 由 CPE Monitor 自动生成`;

  return sendDingtalkMessage(config, 'CPE 日报', text);
}
