'use client';

import { Mail, Send } from 'lucide-react';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import FieldGroup from '@/components/forms/FieldGroup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { EmailConfigForm } from '@/hooks/useSettingsPage';

interface EmailNotificationSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailConfig: EmailConfigForm;
  setEmailConfig: (value: EmailConfigForm) => void;
  emailConfigured: boolean;
  recipientCount: number;
  loading: boolean;
  onSave: () => void;
}

export function EmailNotificationSection({
  open,
  onOpenChange,
  emailConfig,
  setEmailConfig,
  emailConfigured,
  recipientCount,
  loading,
  onSave,
}: EmailNotificationSectionProps) {
  return (
    <SettingsAccordionSection
      id="email"
      icon={<Mail className="h-3.5 w-3.5" />}
      eyebrow="Email"
      title="邮件通知"
      description="告警、日报与新短信提醒。"
      open={open}
      onOpenChange={onOpenChange}
      status={
        <Badge variant={emailConfigured ? 'info' : 'secondary'}>
          {emailConfigured ? '已配置' : '未配置'}
        </Badge>
      }
      summary={[
        { label: 'SMTP 服务器', value: emailConfig.smtpHost || '—' },
        { label: '端口', value: emailConfig.smtpPort || '—' },
        { label: '用户名', value: emailConfig.smtpUser || '—' },
        { label: 'SMTP 密码', value: emailConfig.smtpPass ? '已填写' : '未填写 / 已保存' },
        { label: '发件人', value: emailConfig.from || '—' },
        { label: '收件人', value: recipientCount > 0 ? `${recipientCount} 个邮箱` : '—' },
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,.55fr)]">
        <FieldGroup label="SMTP 服务器">
          <Input
            className="h-9 rounded-lg bg-background/60"
            value={emailConfig.smtpHost}
            onChange={(event) => setEmailConfig({ ...emailConfig, smtpHost: event.target.value })}
            placeholder="smtp.gmail.com"
          />
        </FieldGroup>
        <FieldGroup label="端口">
          <Input
            className="h-9 rounded-lg bg-background/60"
            value={emailConfig.smtpPort}
            onChange={(event) => setEmailConfig({ ...emailConfig, smtpPort: event.target.value })}
            placeholder="587"
          />
        </FieldGroup>
      </div>
      <div className="fluid-card-grid gap-3 [--fluid-card-min:14rem]">
        <FieldGroup label="SMTP 用户名">
          <Input
            className="h-9 rounded-lg bg-background/60"
            value={emailConfig.smtpUser}
            onChange={(event) => setEmailConfig({ ...emailConfig, smtpUser: event.target.value })}
          />
        </FieldGroup>
        <FieldGroup label="SMTP 密码">
          <Input
            className="h-9 rounded-lg bg-background/60"
            type="password"
            value={emailConfig.smtpPass}
            onChange={(event) => setEmailConfig({ ...emailConfig, smtpPass: event.target.value })}
          />
        </FieldGroup>
      </div>
      <FieldGroup label="发件人">
        <Input
          className="h-9 rounded-lg bg-background/60"
          value={emailConfig.from}
          onChange={(event) => setEmailConfig({ ...emailConfig, from: event.target.value })}
          placeholder="noreply@example.com"
        />
      </FieldGroup>
      <FieldGroup label="收件人" hint="每行一个邮箱地址。">
        <Textarea
          className="min-h-20 rounded-lg bg-background/60"
          value={emailConfig.to}
          onChange={(event) => setEmailConfig({ ...emailConfig, to: event.target.value })}
          placeholder={'ops@example.com\nadmin@example.com'}
        />
      </FieldGroup>
      <div className="flex justify-end border-t border-border/60 pt-3">
        <Button size="sm" onClick={onSave} disabled={loading}>
          <Send className="mr-1.5 h-3.5 w-3.5" />保存邮件配置
        </Button>
      </div>
    </SettingsAccordionSection>
  );
}

export default EmailNotificationSection;
