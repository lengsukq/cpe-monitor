'use client';

import { BellRing } from 'lucide-react';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import { SaveButton } from '@/components/settings/SaveButton';
import FieldGroup from '@/components/forms/FieldGroup';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import type { WechatConfigForm } from '@/features/settings/types';

interface WechatNotificationSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wechatConfig: WechatConfigForm;
  setWechatConfig: (value: WechatConfigForm) => void;
  wechatConfigured: boolean;
  loading: boolean;
  onSave: () => void;
}

export function WechatNotificationSection({
  open,
  onOpenChange,
  wechatConfig,
  setWechatConfig,
  wechatConfigured,
  loading,
  onSave,
}: WechatNotificationSectionProps) {
  return (
    <SettingsAccordionSection
      id="wechat"
      icon={<BellRing className="h-3.5 w-3.5" />}
      eyebrow="Webhook"
      title="企业微信通知"
      description="通过群机器人推送告警与新短信。"
      open={open}
      onOpenChange={onOpenChange}
      status={
        <Badge variant={wechatConfigured ? 'info' : 'secondary'}>
          {wechatConfigured ? '已配置' : '未配置'}
        </Badge>
      }
      summary={[
        {
          label: 'Webhook URL',
          value: wechatConfig.webhookUrl
            ? '将更新'
            : wechatConfigured
              ? '已安全保存'
              : '—',
          mono: true,
        },
      ]}
    >
      <FieldGroup
        label="Webhook URL"
        hint={wechatConfigured
          ? 'Webhook 已加密保存；留空可保留现有地址。'
          : '从企业微信群机器人设置复制完整地址。'}
      >
        <Textarea
          className="min-h-20 rounded-lg bg-background/60 font-mono text-xs leading-5"
          value={wechatConfig.webhookUrl}
          onChange={(event) => setWechatConfig({ ...wechatConfig, webhookUrl: event.target.value })}
          placeholder={wechatConfigured
            ? '留空保持现有 Webhook'
            : 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=...'}
        />
      </FieldGroup>
      <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
        配置后，告警与短信同步会使用已启用的通知渠道；不会向 CPE 发送短信。
      </p>
      <div className="mt-auto flex justify-end border-t border-border/60 pt-3">
        <SaveButton saving={loading} onClick={onSave} label="保存企业微信配置" />
      </div>
    </SettingsAccordionSection>
  );
}

export default WechatNotificationSection;
