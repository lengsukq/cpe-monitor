'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Callout from '@/components/Callout';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  BellRing,
  Clock3,
  KeyRound,
  Mail,
  MessageSquareText,
  RadioTower,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Wifi,
  Wrench,
} from 'lucide-react';

export default function SettingsPage() {
  const [cpeConfig, setCpeConfig] = useState({
    cpeUrl: 'http://192.168.31.1',
    cpeUsername: 'admin',
    cpePassword: '',
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    from: '',
    to: '',
  });

  const [wechatConfig, setWechatConfig] = useState({
    webhookUrl: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [smsSyncConfig, setSmsSyncConfig] = useState({
    enabled: true,
    interval: '15',
    running: false,
    lastSyncedAt: null as string | null,
    lastError: null as string | null,
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: string } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{ updateState?: string; message?: string; error?: string } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [savingSmsSync, setSavingSmsSync] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function fetchConfigs() {
    try {
      const [cpeRes, notifRes, smsSyncRes] = await Promise.all([
        fetch('/api/settings/cpe'),
        fetch('/api/settings/notification'),
        fetch('/api/dashboard/sms/settings'),
      ]);

      const cpeData = await cpeRes.json();
      if (cpeData.cpe_url) {
        setCpeConfig({
          cpeUrl: cpeData.cpe_url,
          cpeUsername: cpeData.cpe_username || 'admin',
          cpePassword: '',
        });
      }

      const notifData = await notifRes.json();
      for (const config of notifData) {
        if (config.type === 'email') {
          setEmailConfig(JSON.parse(config.config));
        } else if (config.type === 'wechat') {
          setWechatConfig(JSON.parse(config.config));
        }
      }

      if (smsSyncRes.ok) {
        const smsSyncData = await smsSyncRes.json();
        setSmsSyncConfig({
          enabled: Boolean(smsSyncData.enabled),
          interval: String(smsSyncData.interval || 15),
          running: Boolean(smsSyncData.running),
          lastSyncedAt: smsSyncData.lastSyncedAt || null,
          lastError: smsSyncData.lastError || null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    }
  }

  async function saveCpeConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/cpe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpeConfig),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'CPE 配置已保存' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function testCpeConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/cpe/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpeConfig),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: '测试请求失败' });
    } finally {
      setTesting(false);
    }
  }

  async function fetchUpdateStatus() {
    try {
      const res = await fetch('/api/system/update');
      const data = await res.json();
      if (res.ok) setUpdateStatus(data);
      else setUpdateStatus({ error: data.error || '无法获取升级状态' });
    } catch {
      setUpdateStatus({ error: '无法获取升级状态' });
    }
  }

  async function checkSystemUpdate() {
    setCheckingUpdate(true);
    try {
      const res = await fetch('/api/system/update', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setUpdateStatus(data);
      else setUpdateStatus({ error: data.error || '检查更新失败' });
    } catch {
      setUpdateStatus({ error: '检查更新请求失败' });
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function saveEmailConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', config: emailConfig, enabled: true }),
      });

      if (res.ok) setMessage({ type: 'success', text: '邮件配置已保存' });
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function saveWechatConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'wechat', config: wechatConfig, enabled: true }),
      });

      if (res.ok) setMessage({ type: 'success', text: '企业微信配置已保存' });
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function saveSmsSyncConfig() {
    const interval = Number(smsSyncConfig.interval);
    if (!Number.isInteger(interval) || interval < 1 || interval > 1440) {
      setMessage({ type: 'error', text: '短信同步间隔必须是 1 到 1440 之间的整数分钟' });
      return;
    }

    setSavingSmsSync(true);
    try {
      const res = await fetch('/api/dashboard/sms/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: smsSyncConfig.enabled, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');

      const sync = data.sync || {};
      setSmsSyncConfig({
        enabled: Boolean(sync.enabled),
        interval: String(sync.interval || interval),
        running: Boolean(sync.running),
        lastSyncedAt: sync.lastSyncedAt || null,
        lastError: sync.lastError || null,
      });
      setMessage({ type: 'success', text: '短信自动同步设置已保存' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSavingSmsSync(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: '密码已修改' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || '修改失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '修改失败' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfigs();
    fetchUpdateStatus();
  }, []);

  const smsState = !smsSyncConfig.enabled ? '已暂停' : smsSyncConfig.running ? '运行中' : '等待启动';

  return (
    <div className="page-enter mx-auto w-full max-w-6xl space-y-4 pb-6">
      <PageHeader
        eyebrow="System control"
        title="系统设置"
        description="管理 CPE 连接、自动同步、消息通知与访问安全。各区块独立保存。"
        icon={<Settings2 className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip
              icon={<RadioTower className="h-3.5 w-3.5" />}
              label="CPE"
              value={cpeConfig.cpeUrl ? '已配置' : '待配置'}
            />
            <StatusChip
              icon={<Clock3 className="h-3.5 w-3.5" />}
              label="短信"
              value={smsSyncConfig.enabled ? `每 ${smsSyncConfig.interval} 分钟` : '已暂停'}
            />
            <StatusChip
              icon={<BellRing className="h-3.5 w-3.5" />}
              label="通知"
              value="邮件 · 企微"
            />
          </div>
        }
      />

      {message.text ? (
        <Callout tone={message.type === 'success' ? 'success' : 'danger'}>
          {message.text}
        </Callout>
      ) : null}

      <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="space-y-3 lg:sticky lg:top-24">
          <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm">
            <CardContent className="p-2">
              <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                配置导航
              </p>
              <SettingsNav href="#connection" icon={<Wifi className="h-3.5 w-3.5" />} label="设备连接" detail="地址与凭据" />
              <SettingsNav href="#automation" icon={<MessageSquareText className="h-3.5 w-3.5" />} label="自动化" detail="短信同步" />
              <SettingsNav href="#notifications" icon={<BellRing className="h-3.5 w-3.5" />} label="通知渠道" detail="邮件与企微" />
              <SettingsNav href="#security" icon={<KeyRound className="h-3.5 w-3.5" />} label="访问安全" detail="管理密码" />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-warning/20 shadow-sm">
            <CardHeader className="space-y-0 p-3 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
                    <Wrench className="h-3.5 w-3.5" />
                  </span>
                  <CardTitle className="text-sm font-medium">系统维护</CardTitle>
                </div>
                <Badge variant={updateStatus?.error ? 'secondary' : 'outline'} className="rounded-full text-[10px]">
                  {getUpdateStateLabel(updateStatus?.updateState)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 p-3 pt-0">
              <p className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs leading-5 text-muted-foreground">
                {updateStatus?.error || updateStatus?.message || '手动检查在线升级，不会自动写入 CPE。'}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchUpdateStatus}>
                  <RefreshCw className="mr-1 h-3 w-3" />刷新
                </Button>
                <Button size="sm" className="h-8 text-xs" onClick={checkSystemUpdate} disabled={checkingUpdate}>
                  {checkingUpdate ? '检查中…' : '检查更新'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="px-1 text-xs leading-5 text-muted-foreground">
            各区域独立保存，避免互相覆盖。
          </p>
        </aside>

        <div className="space-y-4">
          <Card id="connection" className="card-hover scroll-mt-24 overflow-hidden border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/60 px-4 py-3">
              <SectionTitle
                icon={<RadioTower className="h-4 w-4" />}
                eyebrow="Device gateway"
                title="CPE 设备连接"
                description="用于读取设备状态、流量、短信与在线终端。"
              />
            </CardHeader>
            <CardContent className="space-y-3.5 px-4 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <FieldGroup label="CPE 地址" hint="本地管理地址或可访问的内网地址。">
                  <Input
                    className="h-9 rounded-lg bg-background/60"
                    value={cpeConfig.cpeUrl}
                    onChange={(e) => setCpeConfig({ ...cpeConfig, cpeUrl: e.target.value })}
                    placeholder="http://192.168.31.1"
                  />
                </FieldGroup>
                <FieldGroup label="用户名">
                  <Input
                    className="h-9 rounded-lg bg-background/60"
                    value={cpeConfig.cpeUsername}
                    onChange={(e) => setCpeConfig({ ...cpeConfig, cpeUsername: e.target.value })}
                  />
                </FieldGroup>
              </div>
              <FieldGroup label="密码" hint="留空可保持现有密码不变。">
                <Input
                  className="h-9 rounded-lg bg-background/60"
                  type="password"
                  value={cpeConfig.cpePassword}
                  onChange={(e) => setCpeConfig({ ...cpeConfig, cpePassword: e.target.value })}
                  placeholder="留空则不修改"
                />
              </FieldGroup>
              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                <Button size="sm" onClick={saveCpeConfig} disabled={loading}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />保存连接配置
                </Button>
                <Button size="sm" variant="outline" onClick={testCpeConnection} disabled={testing}>
                  <RadioTower className="mr-1.5 h-3.5 w-3.5" />
                  {testing ? '正在测试…' : '测试连接'}
                </Button>
              </div>
              {testResult ? (
                <Callout tone={testResult.success ? 'success' : 'danger'} title={testResult.message}>
                  {testResult.latency ? `响应时间：${testResult.latency}` : null}
                </Callout>
              ) : null}
            </CardContent>
          </Card>

          <Card id="automation" className="card-hover scroll-mt-24 overflow-hidden border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/60 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle
                  icon={<MessageSquareText className="h-4 w-4" />}
                  eyebrow="Automation"
                  title="短信自动同步"
                  description="独立持久化；首次同步不会批量推送历史通知。"
                />
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1">
                  <span className="text-xs text-muted-foreground">{smsState}</span>
                  <Switch
                    checked={smsSyncConfig.enabled}
                    disabled={savingSmsSync}
                    onCheckedChange={(enabled) => setSmsSyncConfig({ ...smsSyncConfig, enabled })}
                    aria-label="启用短信自动同步"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 px-4 py-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <FieldGroup label="同步间隔（分钟）" hint="1–1440 的整数，默认 15。">
                  <Input
                    className="h-9 rounded-lg bg-background/60"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={smsSyncConfig.interval}
                    onChange={(e) => setSmsSyncConfig({ ...smsSyncConfig, interval: e.target.value })}
                  />
                </FieldGroup>
                <div className="grid gap-2 sm:grid-cols-2">
                  <StatusTile icon={<Clock3 className="h-3.5 w-3.5" />} label="最近同步" value={formatSyncTime(smsSyncConfig.lastSyncedAt)} />
                  <StatusTile
                    icon={<ShieldCheck className="h-3.5 w-3.5" />}
                    label="同步状态"
                    value={smsState}
                    tone={smsSyncConfig.lastError ? 'warning' : 'success'}
                  />
                </div>
              </div>
              {smsSyncConfig.lastError ? (
                <Callout tone="warning">上次同步失败：{smsSyncConfig.lastError}</Callout>
              ) : null}
              <div className="flex justify-end border-t border-border/60 pt-3">
                <Button size="sm" onClick={saveSmsSyncConfig} disabled={savingSmsSync}>
                  {savingSmsSync ? '保存中…' : <><Save className="mr-1.5 h-3.5 w-3.5" />保存自动化设置</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          <section id="notifications" className="scroll-mt-24 grid gap-4 lg:grid-cols-2">
            <Card className="card-hover overflow-hidden border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 px-4 py-3">
                <SectionTitle
                  icon={<Mail className="h-4 w-4" />}
                  eyebrow="Email"
                  title="邮件通知"
                  description="告警、日报与新短信提醒。"
                />
              </CardHeader>
              <CardContent className="space-y-3 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_88px]">
                  <FieldGroup label="SMTP 服务器">
                    <Input
                      className="h-9 rounded-lg bg-background/60"
                      value={emailConfig.smtpHost}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
                      placeholder="smtp.gmail.com"
                    />
                  </FieldGroup>
                  <FieldGroup label="端口">
                    <Input
                      className="h-9 rounded-lg bg-background/60"
                      value={emailConfig.smtpPort}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })}
                      placeholder="587"
                    />
                  </FieldGroup>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldGroup label="SMTP 用户名">
                    <Input
                      className="h-9 rounded-lg bg-background/60"
                      value={emailConfig.smtpUser}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })}
                    />
                  </FieldGroup>
                  <FieldGroup label="SMTP 密码">
                    <Input
                      className="h-9 rounded-lg bg-background/60"
                      type="password"
                      value={emailConfig.smtpPass}
                      onChange={(e) => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })}
                    />
                  </FieldGroup>
                </div>
                <FieldGroup label="发件人">
                  <Input
                    className="h-9 rounded-lg bg-background/60"
                    value={emailConfig.from}
                    onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })}
                    placeholder="noreply@example.com"
                  />
                </FieldGroup>
                <FieldGroup label="收件人" hint="每行一个邮箱地址。">
                  <Textarea
                    className="min-h-20 rounded-lg bg-background/60"
                    value={emailConfig.to}
                    onChange={(e) => setEmailConfig({ ...emailConfig, to: e.target.value })}
                    placeholder={'ops@example.com\nadmin@example.com'}
                  />
                </FieldGroup>
                <div className="flex justify-end border-t border-border/60 pt-3">
                  <Button size="sm" onClick={saveEmailConfig} disabled={loading}>
                    <Send className="mr-1.5 h-3.5 w-3.5" />保存邮件配置
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover overflow-hidden border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 px-4 py-3">
                <SectionTitle
                  icon={<BellRing className="h-4 w-4" />}
                  eyebrow="Webhook"
                  title="企业微信通知"
                  description="通过群机器人推送告警与新短信。"
                />
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-4 py-4">
                <FieldGroup label="Webhook URL" hint="从企业微信群机器人设置复制完整地址。">
                  <Textarea
                    className="min-h-20 rounded-lg bg-background/60 font-mono text-xs leading-5"
                    value={wechatConfig.webhookUrl}
                    onChange={(e) => setWechatConfig({ ...wechatConfig, webhookUrl: e.target.value })}
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                  />
                </FieldGroup>
                <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                  配置后，告警与短信同步会使用已启用的通知渠道；不会向 CPE 发送短信。
                </p>
                <div className="mt-auto flex justify-end border-t border-border/60 pt-3">
                  <Button size="sm" onClick={saveWechatConfig} disabled={loading}>
                    <Save className="mr-1.5 h-3.5 w-3.5" />保存企业微信配置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card id="security" className="card-hover scroll-mt-24 overflow-hidden border-border/70 shadow-sm">
            <CardHeader className="border-b border-border/60 px-4 py-3">
              <SectionTitle
                icon={<KeyRound className="h-4 w-4" />}
                eyebrow="Access control"
                title="访问安全"
                description="修改管理台登录密码。"
              />
            </CardHeader>
            <CardContent className="space-y-3.5 px-4 py-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <FieldGroup label="当前密码">
                  <Input
                    className="h-9 rounded-lg bg-background/60"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </FieldGroup>
                <FieldGroup label="新密码">
                  <Input
                    className="h-9 rounded-lg bg-background/60"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </FieldGroup>
                <FieldGroup label="确认新密码">
                  <Input
                    className="h-9 rounded-lg bg-background/60"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </FieldGroup>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                <p className="text-xs text-muted-foreground">修改成功后，新密码将用于下一次登录。</p>
                <Button size="sm" onClick={changePassword} disabled={loading}>
                  <KeyRound className="mr-1.5 h-3.5 w-3.5" />更新管理员密码
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getUpdateStateLabel(state?: string) {
  const map: Record<string, string> = {
    '16': '空闲',
    '17': '检查中',
    '32': '有可用更新',
    unknown: '未知',
  };
  return map[state || 'unknown'] || `状态 ${state}`;
}

function formatSyncTime(value: string | null) {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-foreground">
          {icon}
        </span>
        {eyebrow}
      </p>
      <CardTitle className="mt-1.5 text-base tracking-tight">{title}</CardTitle>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatusChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs">
      <span className="text-brand">{icon}</span>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/25 bg-success/5'
      : tone === 'warning'
        ? 'border-warning/25 bg-warning/5'
        : 'border-border/60 bg-muted/30';
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneClass}`}>
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function SettingsNav({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-muted"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition group-hover:bg-brand/10 group-hover:text-brand">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{detail}</span>
      </span>
    </a>
  );
}
