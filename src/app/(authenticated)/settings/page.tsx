'use client';

import {
  BellRing,
  Mail,
  MessageSquareText,
  RadioTower,
  Settings2,
} from 'lucide-react';
import { Callout } from '@/components/Callout';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { LoadingBlock } from '@/components/LoadingBlock';
import { PageOverview } from '@/components/PageOverview';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { CpeConnectionSection } from '@/components/settings/CpeConnectionSection';
import { SmsSyncSection } from '@/components/settings/SmsSyncSection';
import { EmailNotificationSection } from '@/components/settings/EmailNotificationSection';
import { WechatNotificationSection } from '@/components/settings/WechatNotificationSection';
import { PasswordSection } from '@/components/settings/PasswordSection';
import { useSettingsPage } from '@/hooks/useSettingsPage';

export default function SettingsPage() {
  const settings = useSettingsPage();

  if (settings.pageLoading) {
    return (
      <PageShell maxWidth="6xl">
        <LoadingBlock />
      </PageShell>
    );
  }

  const meta = settings.overviewMeta;
  const overviewItems = [
    {
      label: 'CPE 连接',
      value: meta.cpeConfigured ? '已配置' : '待配置',
      detail: meta.cpeUrl || '尚未填写地址',
      icon: <RadioTower className="h-3.5 w-3.5" />,
    },
    {
      label: '短信同步',
      value: meta.smsEnabled ? `每 ${meta.smsInterval} 分钟` : '已暂停',
      detail: meta.smsSyncLabel,
      icon: <MessageSquareText className="h-3.5 w-3.5" />,
    },
    {
      label: '邮件通知',
      value: meta.emailConfigured ? '已启用' : '未配置',
      detail: meta.emailConfigured
        ? `${meta.emailHost} · ${meta.recipientCount} 收件人`
        : '告警与日报将无法发送',
      icon: <Mail className="h-3.5 w-3.5" />,
    },
    {
      label: '企业微信',
      value: meta.wechatConfigured ? '已启用' : '未配置',
      detail: meta.wechatConfigured ? meta.wechatMasked : 'Webhook 尚未填写',
      icon: <BellRing className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <PageShell maxWidth="6xl" className="space-y-4">
      <PageHeader
        eyebrow="System control"
        title="系统设置"
        description="默认展示当前配置摘要；点击「修改」展开对应区块进行编辑，各区块独立保存。"
        icon={<Settings2 className="h-6 w-6" />}
      />

      <PageOverview
        eyebrow="Configuration snapshot"
        title="当前配置摘要"
        description="快速查看连接、同步与通知渠道状态。"
        items={overviewItems}
      />

      {settings.message.text ? (
        <Callout tone={settings.message.type === 'success' ? 'success' : 'danger'}>
          {settings.message.text}
        </Callout>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <SettingsSidebar
          updateStatus={settings.updateStatus}
          checkingUpdate={settings.checkingUpdate}
          onOpenSection={settings.setOpenSection}
          onRefreshUpdate={() => { void settings.fetchUpdateStatus(); }}
          onCheckUpdate={() => { void settings.checkSystemUpdate(); }}
        />

        <div className="space-y-4">
          <CpeConnectionSection
            open={settings.openSection === 'connection'}
            onOpenChange={(open) => settings.setOpenSection(open ? 'connection' : null)}
            cpeConfig={settings.cpeConfig}
            setCpeConfig={settings.setCpeConfig}
            loading={settings.loading}
            testing={settings.testing}
            testResult={settings.testResult}
            onSave={() => { void settings.saveCpeConfig(); }}
            onTest={() => { void settings.testCpeConnection(); }}
          />
          <SmsSyncSection
            open={settings.openSection === 'automation'}
            onOpenChange={(open) => settings.setOpenSection(open ? 'automation' : null)}
            smsSyncConfig={settings.smsSyncConfig}
            setSmsSyncConfig={settings.setSmsSyncConfig}
            smsState={settings.smsState}
            savingSmsSync={settings.savingSmsSync}
            onSave={() => { void settings.saveSmsSyncConfig(); }}
          />
          <EmailNotificationSection
            open={settings.openSection === 'email'}
            onOpenChange={(open) => settings.setOpenSection(open ? 'email' : null)}
            emailConfig={settings.emailConfig}
            setEmailConfig={settings.setEmailConfig}
            emailConfigured={settings.emailConfigured}
            recipientCount={settings.recipientCount}
            loading={settings.loading}
            onSave={() => { void settings.saveEmailConfig(); }}
          />
          <WechatNotificationSection
            open={settings.openSection === 'wechat'}
            onOpenChange={(open) => settings.setOpenSection(open ? 'wechat' : null)}
            wechatConfig={settings.wechatConfig}
            setWechatConfig={settings.setWechatConfig}
            wechatConfigured={settings.wechatConfigured}
            loading={settings.loading}
            onSave={() => { void settings.saveWechatConfig(); }}
          />
          <PasswordSection
            open={settings.openSection === 'security'}
            onOpenChange={(open) => settings.setOpenSection(open ? 'security' : null)}
            passwordForm={settings.passwordForm}
            setPasswordForm={settings.setPasswordForm}
            loading={settings.loading}
            onSave={() => { void settings.changePassword(); }}
          />
        </div>
      </div>
    </PageShell>
  );
}
