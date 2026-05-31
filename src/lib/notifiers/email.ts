import nodemailer from 'nodemailer';
import { render } from '@react-email/render';
import DailyReportEmail from '@/emails/daily-report';
import AlertNotificationEmail from '@/emails/alert-notification';
import type { EmailConfig, DailyReport } from '@/types';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string | string[], subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
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
  return sendEmail(config.to, `CPE 流量日报 - ${report.reportDate}`, emailHtml);
}

export async function sendAlertNotification(config: EmailConfig, alert: { ruleName: string; message: string; timestamp: string }) {
  const emailHtml = await render(AlertNotificationEmail({ data: alert }));
  return sendEmail(config.to, `CPE 告警通知 - ${alert.ruleName}`, emailHtml);
}

export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
