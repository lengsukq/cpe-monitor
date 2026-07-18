import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import DailyReportEmail from '@/emails/daily-report';
import AlertNotificationEmail from '@/emails/alert-notification';
import CollectionReportEmail from '@/emails/collection-report';
import type { EmailConfig, DailyReport } from '@/types';
import type { CpeSmsMessage } from '@/lib/cpe-client';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] || character));
}

function createTransporter(config?: EmailConfig) {
  return nodemailer.createTransport({
    host: config?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(config?.smtpPort || process.env.SMTP_PORT || 587),
    secure: Number(config?.smtpPort || process.env.SMTP_PORT || 587) === 465,
    auth: {
      user: config?.smtpUser || process.env.SMTP_USER,
      pass: config?.smtpPass || process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(to: string | string[], subject: string, html: string, config?: EmailConfig) {
  try {
    const info = await createTransporter(config).sendMail({
      from: config?.from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendDailyReport(config: EmailConfig, report: DailyReport) {
  const emailHtml = await render(DailyReportEmail({ data: report }));
  return sendEmail(config.to, `CPE 流量日报 - ${report.reportDate}`, emailHtml, config);
}

export async function sendAlertNotification(config: EmailConfig, alert: { ruleName: string; message: string; timestamp: string }) {
  const emailHtml = await render(AlertNotificationEmail({ data: alert }));
  return sendEmail(config.to, `CPE 告警通知 - ${alert.ruleName}`, emailHtml, config);
}

export async function sendSmsNotification(config: EmailConfig, sms: CpeSmsMessage) {
  const phone = escapeHtml(sms.phone);
  const content = escapeHtml(sms.content).replace(/\n/g, '<br />');
  const receivedAt = escapeHtml(sms.date || '未知时间');
  const emailHtml = `
    <div style="font-family:Arial,sans-serif;color:#172033;max-width:640px">
      <p style="color:#64748b;font-size:12px;letter-spacing:.08em;text-transform:uppercase">CPE Monitor · SMS</p>
      <h2 style="margin:0 0 18px">收到一条新短信</h2>
      <p><strong>号码：</strong>${phone}</p>
      <p><strong>时间：</strong>${receivedAt}</p>
      <div style="margin-top:18px;padding:16px 18px;border-left:3px solid #16a34a;background:#f1f5f9;line-height:1.7">${content}</div>
      <p style="margin-top:20px;color:#64748b;font-size:12px">由 CPE Monitor 自动同步；此通知不会发送短信。</p>
    </div>`;
  return sendEmail(config.to, `CPE 新短信 - ${sms.phone}`, emailHtml, config);
}

export interface CollectionReportData {
  collectedDevices: number;
  alertsTriggered: number;
  trafficDelta: {
    uploadBytes: number;
    downloadBytes: number;
  } | null;
  signalStrength: number | null;
  topDevices: {
    name: string;
    uploadBytes: number;
    downloadBytes: number;
  }[];
  collectedAt: string;
}

export async function sendCollectionReport(config: EmailConfig, data: CollectionReportData) {
  const emailHtml = await render(CollectionReportEmail({
    collectedDevices: data.collectedDevices,
    alertsTriggered: data.alertsTriggered,
    trafficDelta: data.trafficDelta,
    signalStrength: data.signalStrength,
    topDevices: data.topDevices,
    collectedAt: data.collectedAt,
  }));
  const dateStr = data.collectedAt
    ? new Date(data.collectedAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : '';
  return sendEmail(config.to, `CPE 采集报告 - ${dateStr}`, emailHtml, config);
}

export async function testEmailConnection(config?: EmailConfig): Promise<boolean> {
  try {
    await createTransporter(config).verify();
    return true;
  } catch (error) {
    console.error('Email connection test failed', error);
    return false;
  }
}
