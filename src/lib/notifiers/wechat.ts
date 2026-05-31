import type { WechatConfig } from '@/types';

export async function sendWechatMessage(webhookUrl: string, content: string): Promise<boolean> {
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          content,
        },
      }),
    });

    const result = await resp.json();
    return result.errcode === 0;
  } catch (error) {
    console.error('Failed to send WeChat message:', error);
    return false;
  }
}

export async function sendDailyReportWechat(config: WechatConfig, report: {
  date: string;
  totalDownload: string;
  totalUpload: string;
  deviceCount: number;
  networkQuality: string;
  avgSignal: number;
}) {
  const content = `## CPE 流量日报 - ${report.date}

### 今日概览
- **总下载**: ${report.totalDownload}
- **总上传**: ${report.totalUpload}
- **在线设备**: ${report.deviceCount} 台

### 网络质量
- **评级**: ${report.networkQuality}
- **平均信号**: ${report.avgSignal} dBm

---
> 由 CPE Monitor 自动生成`;

  return sendWechatMessage(config.webhookUrl, content);
}

export async function sendAlertWechat(config: WechatConfig, alert: {
  ruleName: string;
  message: string;
  timestamp: string;
}) {
  const content = `## CPE 告警通知

### ${alert.ruleName}

**时间**: ${alert.timestamp}

**详情**: ${alert.message}

---
> 请及时检查设备状态`;

  return sendWechatMessage(config.webhookUrl, content);
}
