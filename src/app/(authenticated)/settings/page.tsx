'use client';

import { BellRing, Database, RadioTower, Settings2, Workflow } from 'lucide-react';
import { Callout } from '@/components/Callout';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import {
  OverviewBars,
  OverviewDonut,
  OverviewSegments,
} from '@/components/overview/OverviewMiniCharts';
import { LoadingBlock } from '@/components/LoadingBlock';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { CpeConnectionSection } from '@/components/settings/CpeConnectionSection';
import { SmsSyncSection } from '@/components/settings/SmsSyncSection';
import { DataRetentionSection } from '@/components/settings/DataRetentionSection';
import { EmailNotificationSection } from '@/components/settings/EmailNotificationSection';
import { WechatNotificationSection } from '@/components/settings/WechatNotificationSection';
import { PasswordSection } from '@/components/settings/PasswordSection';
import { ThemeColorSection } from '@/components/settings/ThemeColorSection';
import { useSettingsPage } from '@/hooks/useSettingsPage';

export default function SettingsPage() {
  const settings = useSettingsPage();

  if (settings.pageLoading) {
    return (
      <PageShell>
        <LoadingBlock />
      </PageShell>
    );
  }

  const cpeConfigured = Boolean(
    settings.cpeConfig.cpeUrl.trim() && settings.cpeConfig.cpeUsername.trim(),
  );
  const notificationConfiguredCount = Number(settings.emailConfigured)
    + Number(settings.wechatConfigured);
  const historyDays = Number.parseInt(settings.dataRetention.historyDays, 10) || 0;
  const runDays = Number.parseInt(settings.dataRetention.runDays, 10) || 0;

  return (
    <PageShell className="space-y-5">
      <PageHeader
        eyebrow="System control"
        title="系统设置"
        description="默认展示当前配置摘要；点击「修改」展开对应区块进行编辑，各区块独立保存。"
        icon={<Settings2 className="h-6 w-6" />}
      />

      <PageOverview
        eyebrow={<><Settings2 className="h-3.5 w-3.5" />System / readiness</>}
        title="配置就绪度"
        description="从连接、自动化、通知和数据保留四个维度检查系统是否已经可以稳定运行。"
        items={[
          {
            label: 'CPE 连接',
            value: cpeConfigured ? '已配置' : '待配置',
            detail: settings.cpeConfig.cpeUrl || '尚未设置设备地址',
            icon: <RadioTower className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={cpeConfigured ? 1 : 0}
                total={1}
                centerLabel={cpeConfigured ? '就绪' : '未配'}
                label="CPE 连接配置状态"
                className={cpeConfigured ? 'text-success' : 'text-warning'}
              />
            ),
          },
          {
            label: '短信自动化',
            value: settings.smsSyncConfig.enabled
              ? `每 ${settings.smsSyncConfig.interval} 分钟`
              : '已暂停',
            detail: settings.smsSyncConfig.running ? '后台任务运行中' : '当前没有运行',
            icon: <Workflow className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={settings.smsSyncConfig.running ? 1 : 0}
                total={1}
                centerLabel={settings.smsSyncConfig.running ? '运行' : '暂停'}
                label="短信自动化运行状态"
                className={settings.smsSyncConfig.running ? 'text-success' : 'text-muted-foreground'}
              />
            ),
          },
          {
            label: '通知渠道',
            value: `${notificationConfiguredCount} / 2`,
            detail: settings.emailConfigured
              ? `邮件 ${settings.recipientCount} 个收件人`
              : '邮件尚未配置',
            icon: <BellRing className="h-3.5 w-3.5" />,
            chart: (
              <OverviewSegments
                segments={[
                  { label: '邮件', value: settings.emailConfigured ? 1 : 0 },
                  { label: '企微', value: settings.wechatConfigured ? 1 : 0 },
                ]}
                label="通知渠道配置状态"
              />
            ),
          },
          {
            label: '数据保留',
            value: `${historyDays} 天`,
            detail: `采集运行记录保留 ${runDays} 天`,
            icon: <Database className="h-3.5 w-3.5" />,
            chart: (
              <OverviewBars
                values={[historyDays, runDays]}
                label="历史数据与运行记录保留周期"
                className="text-info"
              />
            ),
          },
        ]}
      />

      {settings.message.text ? (
        <Callout tone={settings.message.type === 'success' ? 'success' : 'danger'}>
          {settings.message.text}
        </Callout>
      ) : null}

      <div className="fluid-sidebar-grid gap-5">
        <SettingsSidebar
          updateStatus={settings.updateStatus}
          checkingUpdate={settings.checkingUpdate}
          onOpenSection={settings.setOpenSection}
          onRefreshUpdate={() => { void settings.fetchUpdateStatus(); }}
          onCheckUpdate={() => { void settings.checkSystemUpdate(); }}
        />

        <div className="space-y-4">
          <ThemeColorSection />
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
          <DataRetentionSection
            open={settings.openSection === 'retention'}
            onOpenChange={(open) => settings.setOpenSection(open ? 'retention' : null)}
            value={settings.dataRetention}
            onChange={settings.setDataRetention}
            saving={settings.savingDataRetention}
            onSave={(cleanupNow) => { void settings.saveDataRetention(cleanupNow); }}
          />
          <EmailNotificationSection
            open={settings.openSection === 'email'}
            onOpenChange={(open) => settings.setOpenSection(open ? 'email' : null)}
            emailConfig={settings.emailConfig}
            setEmailConfig={settings.setEmailConfig}
            emailConfigured={settings.emailConfigured}
            passwordConfigured={settings.emailPasswordSet}
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
