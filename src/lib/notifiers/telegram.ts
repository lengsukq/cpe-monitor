/**
 * Telegram Bot API notifier.
 * Uses sendMessage endpoint: https://api.telegram.org/bot<token>/sendMessage
 */

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export async function sendTelegramMessage(config: TelegramConfig, text: string): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });
    const result = await resp.json();
    return result.ok === true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

export async function sendAlertTelegram(config: TelegramConfig, alert: {
  ruleName: string;
  message: string;
  timestamp: string;
}): Promise<boolean> {
  const text = `🚨 *CPE 告警通知*

*${alert.ruleName}*

时间: ${alert.timestamp}

${alert.message}

---
_请及时检查设备状态_`;

  return sendTelegramMessage(config, text);
}

export async function sendDailyReportTelegram(config: TelegramConfig, report: {
  date: string;
  totalDownload: string;
  totalUpload: string;
  deviceCount: number;
  networkQuality: string;
  avgSignal: number;
}): Promise<boolean> {
  const text = `📊 *CPE 流量日报 - ${report.date}*

*今日概览*
• 总下载: ${report.totalDownload}
• 总上传: ${report.totalUpload}
• 在线设备: ${report.deviceCount} 台

*网络质量*
• 评级: ${report.networkQuality}
• 平均信号: ${report.avgSignal} dBm

---
_由 CPE Monitor 自动生成_`;

  return sendTelegramMessage(config, text);
}
