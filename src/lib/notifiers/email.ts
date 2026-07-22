import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import DailyReportEmail from '@/emails/daily-report';
import AlertNotificationEmail, {
  type AlertNotificationEmailData,
} from '@/emails/alert-notification';
import CollectionReportEmail, {
  type CollectionReportEmailData,
} from '@/emails/collection-report';
import SmsNotificationEmail from '@/emails/sms-notification';
import type { EmailConfig, DailyReport } from '@/types';
import type { CpeSmsMessage } from '@/lib/cpe-client';

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

export async function sendAlertNotification(
  config: EmailConfig,
  alert: AlertNotificationEmailData,
) {
  const emailHtml = await render(AlertNotificationEmail({ data: alert }));
  const severityLabel = alert.severity === 'critical'
    ? '严重'
    : alert.severity === 'info'
      ? '状态'
      : '告警';
  return sendEmail(
    config.to,
    `[${severityLabel}] CPE 告警 - ${alert.ruleName}`,
    emailHtml,
    config,
  );
}

export async function sendSmsNotification(config: EmailConfig, sms: CpeSmsMessage) {
  const emailHtml = await render(SmsNotificationEmail({ data: sms }));
  return sendEmail(config.to, `CPE 新短信 - ${sms.phone}`, emailHtml, config);
}

export type CollectionReportData = CollectionReportEmailData;

export async function sendCollectionReport(config: EmailConfig, data: CollectionReportData) {
  const emailHtml = await render(CollectionReportEmail({ data }));
  const dateStr = data.collectedAt
    ? new Date(data.collectedAt).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : '';
  return sendEmail(
    config.to,
    `${data.success ? 'CPE 采集报告' : 'CPE 采集失败'} - ${dateStr}`,
    emailHtml,
    config,
  );
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
