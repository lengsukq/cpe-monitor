'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  BellRing,
  CheckCircle2,
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
  Sparkles,
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
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-[#102219] px-6 py-7 text-white shadow-xl shadow-emerald-950/15 lg:px-9 lg:py-9">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-28 w-96 rounded-full bg-lime-200/10 blur-3xl" />
        <div className="absolute right-[28%] top-10 grid grid-cols-4 gap-3 opacity-20">
          {Array.from({ length: 12 }).map((_, index) => <span key={index} className="h-1 w-1 rounded-full bg-emerald-100" />)}
        </div>
        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80"><Settings2 className="h-4 w-4" />System control room</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">系统设置</h1>
            <p className="mt-3 text-sm leading-6 text-emerald-50/70">集中管理 CPE 连接、自动同步、消息通知与访问安全。设置会在保存后立即写入本地控制面板。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
            <HeroMetric icon={<RadioTower className="h-4 w-4" />} label="CPE 连接" value={cpeConfig.cpeUrl ? '已配置' : '待配置'} />
            <HeroMetric icon={<Clock3 className="h-4 w-4" />} label="短信同步" value={smsSyncConfig.enabled ? `每 ${smsSyncConfig.interval} 分钟` : '已暂停'} />
            <HeroMetric icon={<BellRing className="h-4 w-4" />} label="通知渠道" value="邮件 · 企业微信" />
          </div>
        </div>
      </section>

      {message.text && (
        <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${message.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-300'}`}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(265px,.68fr)_minmax(0,1.32fr)]">
        <aside className="space-y-5 xl:sticky xl:top-24">
          <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm">
            <CardContent className="p-3">
              <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">配置导航</p>
              <SettingsNav href="#connection" icon={<Wifi className="h-4 w-4" />} label="设备连接" detail="地址与凭据" />
              <SettingsNav href="#automation" icon={<MessageSquareText className="h-4 w-4" />} label="自动化" detail="短信持久化与同步" />
              <SettingsNav href="#notifications" icon={<BellRing className="h-4 w-4" />} label="通知渠道" detail="邮件与企业微信" />
              <SettingsNav href="#security" icon={<KeyRound className="h-4 w-4" />} label="访问安全" detail="修改管理密码" />
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-amber-500/15 bg-[linear-gradient(145deg,rgba(245,158,11,.08),transparent_58%)] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <SectionTitle icon={<Wrench className="h-4 w-4" />} eyebrow="Maintenance" title="系统维护" />
                <Badge variant={updateStatus?.error ? 'secondary' : 'outline'} className="rounded-full">{getUpdateStateLabel(updateStatus?.updateState)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="rounded-xl border border-border/60 bg-background/40 p-3 text-sm leading-6 text-muted-foreground">
                {updateStatus?.error || updateStatus?.message || '仅在点击时检查设备在线升级，不会自动写入 CPE。'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={fetchUpdateStatus}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />刷新状态</Button>
                <Button size="sm" onClick={checkSystemUpdate} disabled={checkingUpdate}>{checkingUpdate ? '检查中...' : '检查更新'}</Button>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-[1.5rem] border border-emerald-500/15 bg-emerald-500/[0.06] p-5 text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
            <p className="mt-3 font-medium text-foreground">设置即时生效</p>
            <p className="mt-1 leading-6">每个区域独立保存，避免更新通知或密码时意外覆盖 CPE 连接信息。</p>
          </div>
        </aside>

        <div className="space-y-6">
          <Card id="connection" className="card-hover scroll-mt-28 overflow-hidden border-border/70 bg-card/85 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-emerald-500/[0.07] to-transparent pb-5">
              <SectionTitle icon={<RadioTower className="h-5 w-5" />} eyebrow="Device gateway" title="CPE 设备连接" description="用于实时读取设备状态、流量、短信与在线终端。" />
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <FieldGroup label="CPE 地址" hint="本地管理地址或可访问的内网地址。">
                  <Input className="h-11 rounded-xl bg-background/60" value={cpeConfig.cpeUrl} onChange={(e) => setCpeConfig({ ...cpeConfig, cpeUrl: e.target.value })} placeholder="http://192.168.31.1" />
                </FieldGroup>
                <FieldGroup label="用户名">
                  <Input className="h-11 rounded-xl bg-background/60" value={cpeConfig.cpeUsername} onChange={(e) => setCpeConfig({ ...cpeConfig, cpeUsername: e.target.value })} />
                </FieldGroup>
              </div>
              <FieldGroup label="密码" hint="留空可保持现有密码不变。">
                <Input className="h-11 rounded-xl bg-background/60" type="password" value={cpeConfig.cpePassword} onChange={(e) => setCpeConfig({ ...cpeConfig, cpePassword: e.target.value })} placeholder="留空则不修改" />
              </FieldGroup>
              <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-5">
                <Button onClick={saveCpeConfig} disabled={loading}><Save className="mr-2 h-4 w-4" />保存连接配置</Button>
                <Button variant="outline" onClick={testCpeConnection} disabled={testing}><RadioTower className="mr-2 h-4 w-4" />{testing ? '正在测试...' : '测试连接'}</Button>
              </div>
              {testResult && (
                <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${testResult.success ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300' : 'border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-300'}`}>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div><p className="font-medium">{testResult.message}</p>{testResult.latency && <p className="mt-1 opacity-80">响应时间：{testResult.latency}</p>}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card id="automation" className="card-hover scroll-mt-28 overflow-hidden border-emerald-500/15 bg-[linear-gradient(135deg,rgba(16,185,129,.08),transparent_48%),hsl(var(--card))] shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle icon={<MessageSquareText className="h-5 w-5" />} eyebrow="Automation" title="短信自动同步" description="短信独立于流量监控持久化，首次同步不会批量推送历史通知。" />
                <div className="flex items-center gap-3 rounded-full border border-emerald-500/15 bg-emerald-500/[0.08] px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground">{smsState}</span>
                  <Switch
                    checked={smsSyncConfig.enabled}
                    disabled={savingSmsSync}
                    onCheckedChange={(enabled) => setSmsSyncConfig({ ...smsSyncConfig, enabled })}
                    aria-label="启用短信自动同步"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
                <FieldGroup label="同步间隔（分钟）" hint="支持 1–1440 分钟的整数，默认 15 分钟。">
                  <Input className="h-11 rounded-xl bg-background/60" type="number" min="1" max="1440" step="1" value={smsSyncConfig.interval} onChange={(e) => setSmsSyncConfig({ ...smsSyncConfig, interval: e.target.value })} />
                </FieldGroup>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatusTile icon={<Clock3 className="h-4 w-4" />} label="最近同步" value={formatSyncTime(smsSyncConfig.lastSyncedAt)} />
                  <StatusTile icon={<ShieldCheck className="h-4 w-4" />} label="同步状态" value={smsState} tone={smsSyncConfig.lastError ? 'warning' : 'success'} />
                </div>
              </div>
              {smsSyncConfig.lastError ? <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">上次同步失败：{smsSyncConfig.lastError}</div> : null}
              <div className="flex justify-end border-t border-border/60 pt-5"><Button onClick={saveSmsSyncConfig} disabled={savingSmsSync}>{savingSmsSync ? '保存中...' : <><Save className="mr-2 h-4 w-4" />保存自动化设置</>}</Button></div>
            </CardContent>
          </Card>

          <section id="notifications" className="scroll-mt-28 grid gap-6 2xl:grid-cols-2">
            <Card className="card-hover overflow-hidden border-sky-500/15 bg-[linear-gradient(145deg,rgba(14,165,233,.08),transparent_52%),hsl(var(--card))] shadow-sm">
              <CardHeader className="pb-4"><SectionTitle icon={<Mail className="h-5 w-5" />} eyebrow="Email delivery" title="邮件通知" description="用于告警、日报和新短信提醒。" /></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_100px]">
                  <FieldGroup label="SMTP 服务器"><Input className="h-10 rounded-xl bg-background/60" value={emailConfig.smtpHost} onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })} placeholder="smtp.gmail.com" /></FieldGroup>
                  <FieldGroup label="端口"><Input className="h-10 rounded-xl bg-background/60" value={emailConfig.smtpPort} onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })} placeholder="587" /></FieldGroup>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGroup label="SMTP 用户名"><Input className="h-10 rounded-xl bg-background/60" value={emailConfig.smtpUser} onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })} /></FieldGroup>
                  <FieldGroup label="SMTP 密码"><Input className="h-10 rounded-xl bg-background/60" type="password" value={emailConfig.smtpPass} onChange={(e) => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })} /></FieldGroup>
                </div>
                <FieldGroup label="发件人"><Input className="h-10 rounded-xl bg-background/60" value={emailConfig.from} onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })} placeholder="noreply@example.com" /></FieldGroup>
                <FieldGroup label="收件人" hint="每行一个邮箱地址。"><Textarea className="min-h-24 rounded-xl bg-background/60" value={emailConfig.to} onChange={(e) => setEmailConfig({ ...emailConfig, to: e.target.value })} placeholder={'ops@example.com\\nadmin@example.com'} /></FieldGroup>
                <div className="flex justify-end border-t border-border/60 pt-4"><Button size="sm" onClick={saveEmailConfig} disabled={loading}><Send className="mr-2 h-3.5 w-3.5" />保存邮件配置</Button></div>
              </CardContent>
            </Card>

            <Card className="card-hover overflow-hidden border-violet-500/15 bg-[linear-gradient(145deg,rgba(139,92,246,.08),transparent_52%),hsl(var(--card))] shadow-sm">
              <CardHeader className="pb-4"><SectionTitle icon={<BellRing className="h-5 w-5" />} eyebrow="Webhook delivery" title="企业微信通知" description="通过群机器人推送告警与新短信。" /></CardHeader>
              <CardContent className="flex min-h-[300px] flex-col gap-5">
                <FieldGroup label="Webhook URL" hint="在企业微信群机器人设置中复制完整 Webhook 地址。">
                  <Textarea className="min-h-28 rounded-xl bg-background/60 font-mono text-xs leading-5" value={wechatConfig.webhookUrl} onChange={(e) => setWechatConfig({ ...wechatConfig, webhookUrl: e.target.value })} placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." />
                </FieldGroup>
                <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.07] p-4 text-sm leading-6 text-muted-foreground">
                  配置完成后，告警规则和短信同步会自动使用已启用的通知渠道；不会向 CPE 发送短信。
                </div>
                <div className="mt-auto flex justify-end border-t border-border/60 pt-4"><Button size="sm" onClick={saveWechatConfig} disabled={loading}><Save className="mr-2 h-3.5 w-3.5" />保存企业微信配置</Button></div>
              </CardContent>
            </Card>
          </section>

          <Card id="security" className="card-hover scroll-mt-28 overflow-hidden border-border/70 bg-card/85 shadow-sm">
            <CardHeader className="border-b border-border/60 bg-gradient-to-r from-slate-500/[0.07] to-transparent pb-5"><SectionTitle icon={<KeyRound className="h-5 w-5" />} eyebrow="Access control" title="访问安全" description="修改登录管理台的管理员密码。" /></CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <FieldGroup label="当前密码"><Input className="h-11 rounded-xl bg-background/60" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} /></FieldGroup>
                <FieldGroup label="新密码"><Input className="h-11 rounded-xl bg-background/60" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} /></FieldGroup>
                <FieldGroup label="确认新密码"><Input className="h-11 rounded-xl bg-background/60" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} /></FieldGroup>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
                <p className="text-xs text-muted-foreground">修改成功后，新密码将用于下一次登录。</p>
                <Button onClick={changePassword} disabled={loading}><KeyRound className="mr-2 h-4 w-4" />更新管理员密码</Button>
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

function SectionTitle({ icon, eyebrow, title, description }: { icon: ReactNode; eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-foreground/5 text-foreground">{icon}</span>{eyebrow}</p>
      <CardTitle className="mt-3 text-xl tracking-tight">{title}</CardTitle>
      {description ? <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="space-y-2"><Label className="font-medium">{label}</Label>{children}{hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}</div>;
}

function HeroMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><p className="flex items-center gap-2 text-xs text-emerald-100/65">{icon}{label}</p><p className="mt-2 truncate text-sm font-medium text-white">{value}</p></div>;
}

function StatusTile({ icon, label, value, tone = 'default' }: { icon: ReactNode; label: string; value: string; tone?: 'default' | 'success' | 'warning' }) {
  const toneClass = tone === 'success' ? 'border-emerald-500/20 bg-emerald-500/[0.07]' : tone === 'warning' ? 'border-amber-500/20 bg-amber-500/[0.07]' : 'border-border/60 bg-background/40';
  return <div className={`rounded-2xl border p-4 ${toneClass}`}><p className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</p><p className="mt-2 truncate text-sm font-medium text-foreground">{value}</p></div>;
}

function SettingsNav({ href, icon, label, detail }: { href: string; icon: ReactNode; label: string; detail: string }) {
  return <a href={href} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-muted"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition group-hover:bg-emerald-500/10 group-hover:text-emerald-600 dark:group-hover:text-emerald-300">{icon}</span><span className="min-w-0"><span className="block text-sm font-medium">{label}</span><span className="block truncate text-xs text-muted-foreground">{detail}</span></span></a>;
}
