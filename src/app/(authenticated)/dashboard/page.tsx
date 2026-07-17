'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Smartphone, Bell, Settings, ArrowRight, Activity, RefreshCw, Wifi, Radio, Clock3, ShieldCheck, MessageSquareText, Gauge, CheckCircle2 } from 'lucide-react';
import TrafficChart from '@/components/TrafficChart';
import { formatRate, formatWithUnit, formatDuration, getSignalQuality } from '@/lib/format';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [trafficStats, setTrafficStats] = useState<any>(null);
  const [unit, setUnit] = useState<'MB' | 'GB'>('GB');
  const [startDate, setStartDate] = useState<any>(null);
  const [overviewError, setOverviewError] = useState('');
  const [dataError, setDataError] = useState('');
  const [deviceSnapshot, setDeviceSnapshot] = useState<any>(null);
  const [smsSync, setSmsSync] = useState<any>(null);
  const [schedulerSaving, setSchedulerSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  async function fetchOverview() {
    try {
      const res = await fetch('/api/dashboard/overview');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取概览失败');
      setOverview(data);
      setOverviewError(data.cpeError || '');
      setLastRefreshAt(new Date());
    } catch (e: any) {
      console.error(e);
      setOverviewError(e.message || '无法获取实时状态，正在显示兜底数据');
    }
    finally { setLoading(false); }
  }

  async function fetchTrafficHistory() {
    try {
      const res = await fetch(`/api/dashboard/traffic?range=${timeRange}`);
      setTrafficHistory(await res.json());
    } catch (e) { console.error(e); }
  }

  async function fetchTrafficStats() {
    try {
      const res = await fetch('/api/dashboard/traffic-stats');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取流量统计失败');
      setTrafficStats(data);
      setDataError('');
    } catch (e: any) {
      console.error(e);
      setDataError(e.message || 'CPE 登录失败，无法获取流量统计。');
    }
  }

  async function fetchStartDate() {
    try {
      const res = await fetch('/api/dashboard/start-date');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取套餐配置失败');
      setStartDate(data);
    } catch (e: any) {
      console.error(e);
      setDataError(e.message || 'CPE 登录失败，无法获取套餐配置。');
    }
  }

  async function fetchDeviceSnapshot() {
    try {
      const res = await fetch('/api/dashboard/device');
      if (res.ok) setDeviceSnapshot(await res.json());
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchSmsSyncStatus() {
    try {
      const res = await fetch('/api/dashboard/sms/settings');
      const data = await res.json();
      if (res.ok) setSmsSync(data);
    } catch (e) {
      console.error(e);
    }
  }

  async function refreshDashboard() {
    setRefreshing(true);
    await Promise.allSettled([
      fetchOverview(),
      fetchTrafficHistory(),
      fetchTrafficStats(),
      fetchStartDate(),
      fetchDeviceSnapshot(),
      fetchSmsSyncStatus(),
    ]);
    setRefreshing(false);
  }

  async function updateScheduler(enabled: boolean, interval = overview?.schedulerStatus?.interval || 60) {
    setSchedulerSaving(true);
    try {
      const res = await fetch('/api/dashboard/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, interval }),
      });
      if (!res.ok) throw new Error('调度设置保存失败');
      const data = await res.json();
      setOverview((current: any) => current ? { ...current, schedulerStatus: data.status || { enabled, interval, running: enabled } } : current);
    } catch (e) {
      console.error(e);
    } finally {
      setSchedulerSaving(false);
    }
  }

  useEffect(() => {
    fetchOverview();
    fetchTrafficHistory();
    fetchTrafficStats();
    fetchStartDate();
    fetchDeviceSnapshot();
    fetchSmsSyncStatus();

    const interval = setInterval(() => {
      fetchOverview();
      fetchTrafficStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTrafficHistory();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const sq = overview ? getSignalQuality(overview.signalStrength) : null;
  const rate = trafficStats || {};
  const isConnected = overview?.connectionStatus === '901';
  const updateLabel = getUpdateStateLabel(overview?.updateState);
  const cell = deviceSnapshot?.cellInformation || {};
  const deviceName = getSnapshotValue(deviceSnapshot?.deviceInformation, ['DeviceName', 'spreadname_zh', 'spreadname_en']);
  const smsSyncLabel = smsSync?.enabled ? '每 ' + smsSync.interval + ' 分钟' : '已暂停';
  const smsSyncDetail = smsSync?.lastError
    ? '最近同步失败'
    : smsSync?.lastSyncedAt
      ? '最近同步 ' + formatLastRefresh(new Date(smsSync.lastSyncedAt))
      : '尚未同步';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">CPE / live console</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">仪表盘</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">把实时状态、流量、套餐和设备活动集中在一个可操作的监控台里。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {lastRefreshAt ? '更新于 ' + formatLastRefresh(lastRefreshAt) : '正在同步'}
          </div>
          <Badge variant={overview?.source === 'cpe' ? 'default' : 'secondary'} className="rounded-full px-3 py-1">
            {overview?.source === 'cpe' ? '实时 CPE 数据' : '数据库兜底数据'}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => { void refreshDashboard(); }} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            {refreshing ? '刷新中' : '刷新数据'}
          </Button>
        </div>
      </div>

      {overviewError && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-medium">CPE 登录/连接失败</p>
          <p className="mt-1">{overviewError}</p>
        </div>
      )}

      {dataError && !overviewError && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-medium">部分实时数据不可用</p>
          <p className="mt-1">{dataError}</p>
        </div>
      )}

      <Card className="card-hover bg-gradient-to-br from-card/90 to-card/50">
        <CardContent className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-4">
          <StatusPill icon={<Wifi className="h-4 w-4" />} label="蜂窝连接" value={isConnected ? '已连接' : '未连接/未知'} tone={isConnected ? 'success' : 'muted'} />
          <StatusPill icon={<RefreshCw className="h-4 w-4" />} label="升级状态" value={updateLabel} tone={overview?.updateState === 'unknown' ? 'muted' : 'info'} />
          <StatusPill icon={<Activity className="h-4 w-4" />} label="定时采集" value={overview?.schedulerStatus?.running ? '运行中' : overview?.schedulerStatus?.enabled ? `每 ${overview.schedulerStatus.interval} 分钟` : '未启用'} tone={overview?.schedulerStatus?.running ? 'success' : 'muted'} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="card-hover overflow-hidden border-sky-500/15 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,.16),transparent_42%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--card)))]">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Radio className="h-4 w-4 text-sky-500" />当前小区</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">实时蜂窝注册信息与 CPE 身份</p>
            </div>
            <Badge variant="outline" className="rounded-full">{overview?.networkType && overview.networkType !== 'unknown' ? overview.networkType : '等待数据'}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <SnapshotItem label="设备型号" value={getSnapshotValue(deviceSnapshot?.deviceInformation, ['DeviceName', 'spreadname_zh', 'spreadname_en'])} />
              <SnapshotItem label="运营商" value={cell.carrier || getCarrierName(deviceSnapshot?.deviceInformation?.Mccmnc)} />
              <SnapshotItem label="频段" value={cell.band} />
              <SnapshotItem label="小区 ID" value={cell.cellId} mono />
              <SnapshotItem label="PCI" value={cell.pci} />
              <SnapshotItem label="RSRP" value={cell.rsrp} />
              <SnapshotItem label="RSRQ" value={cell.rsrq} />
              <SnapshotItem label="SINR" value={cell.sinr} />
              <SnapshotItem label="当前状态" value={overview?.connectionStatus === '901' ? '已连接' : '未连接/未知'} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-amber-500" />定时监控</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">采集流量、设备数和信号，并触发告警</p>
            </div>
            <Switch
              checked={Boolean(overview?.schedulerStatus?.enabled)}
              disabled={schedulerSaving}
              onCheckedChange={(checked) => updateScheduler(checked)}
              aria-label="启用定时监控"
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
              <div>
                <p className="text-sm font-medium">采集频率</p>
                <p className="text-xs text-muted-foreground">后台任务 {overview?.schedulerStatus?.running ? '正在运行' : '尚未运行'}</p>
              </div>
              <Select
                value={String(overview?.schedulerStatus?.interval || 60)}
                onValueChange={(value) => updateScheduler(Boolean(overview?.schedulerStatus?.enabled), Number(value))}
              >
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 15, 30, 60].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>每 {minutes} 分钟</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              告警规则按静默期去重，通知渠道在“设置”中配置
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="下载速率" value={formatRate(parseInt(rate.CurrentDownloadRate || '0'))} color="text-blue-600" />
        <StatCard label="上传速率" value={formatRate(parseInt(rate.CurrentUploadRate || '0'))} color="text-purple-600" />
        <StatCard href="/device#online-devices" label="在线设备" value={`${overview?.connectedDevices || 0} 台`} color="text-green-600" />
        <Card className="card-hover">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">信号强度</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.signalStrength || 0} dBm
              {sq && <Badge variant={sq.variant} className="ml-2 text-xs">{sq.label}</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Stats + Data Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>流量统计</CardTitle>
              <UnitToggle unit={unit} onChange={setUnit} />
            </div>
          </CardHeader>
          <CardContent>
            {trafficStats ? (
              <div className="grid grid-cols-2 gap-4">
                <StatItem label="本次下载" value={formatWithUnit(parseInt(rate.CurrentDownload || '0'), unit)} />
                <StatItem label="本次上传" value={formatWithUnit(parseInt(rate.CurrentUpload || '0'), unit)} />
                <StatItem label="累计下载" value={formatWithUnit(parseInt(rate.TotalDownload || '0'), unit)} />
                <StatItem label="累计上传" value={formatWithUnit(parseInt(rate.TotalUpload || '0'), unit)} />
                <StatItem label="本次连接" value={formatDuration(parseInt(rate.CurrentConnectTime || '0'))} />
                <StatItem label="累计连接" value={formatDuration(parseInt(rate.TotalConnectTime || '0'))} />
              </div>
            ) : <Skeleton className="h-32" />}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>套餐用量</CardTitle>
              {startDate && <Badge variant="outline">每月 {startDate.StartDay || 1} 号重置</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {startDate && trafficStats ? (
              <DataPlanCard startDate={startDate} trafficStats={trafficStats} />
            ) : <Skeleton className="h-32" />}
          </CardContent>
        </Card>
      </div>

      {/* Traffic Chart */}
      <Card className="card-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>流量趋势</CardTitle>
            <div className="flex gap-2">
              {['1h', '6h', '24h', '7d'].map((r) => (
                <Button key={r} size="sm" variant={timeRange === r ? 'default' : 'outline'} onClick={() => setTimeRange(r)}>
                  {r}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80"><TrafficChart data={trafficHistory} /></div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink href="/device" icon={<Smartphone className="h-5 w-5" />} label="设备详情" description="查看设备信息、在线设备" />
        <QuickLink href="/alerts" icon={<Bell className="h-5 w-5" />} label="告警规则" description="管理流量告警阈值" />
        <QuickLink href="/settings" icon={<Settings className="h-5 w-5" />} label="系统设置" description="CPE 连接、通知配置" />
      </div>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#102219] px-4 py-5 text-white shadow-xl shadow-emerald-950/15 sm:px-6 sm:py-7 lg:px-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200/75 sm:text-xs">
              <Gauge className="h-3.5 w-3.5" />
              CPE / runtime summary
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">运行摘要</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-emerald-50/65 sm:text-sm">把设备、网络、信号、终端和短信同步状态收拢在一处，方便快速判断当前是否需要处理。</p>
          </div>
          <Link href="/device" className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15">
            查看设备详情
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          <SummaryTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="CPE 连接" value={isConnected ? '已连接' : '未连接/未知'} detail={overview?.source === 'cpe' ? '实时数据' : '数据库兜底'} href="/device" />
          <SummaryTile icon={<Smartphone className="h-3.5 w-3.5" />} label="在线终端" value={String(overview?.connectedDevices || 0) + ' 台'} detail="点击查看在线列表" href="/device#online-devices" />
          <SummaryTile icon={<Radio className="h-3.5 w-3.5" />} label="当前小区" value={cell.cellId || '-'} detail={(cell.networkType || overview?.networkType || '网络未知') + ' · ' + getCarrierName(deviceSnapshot?.deviceInformation?.Mccmnc)} href="/device" />
          <SummaryTile icon={<Wifi className="h-3.5 w-3.5" />} label="信号强度" value={overview?.signalStrength ? String(overview.signalStrength) + ' dBm' : '-'} detail={sq?.label || '等待数据'} href="/device" />
          <SummaryTile icon={<MessageSquareText className="h-3.5 w-3.5" />} label="短信同步" value={smsSyncLabel} detail={smsSyncDetail} href="/sms" />
        </div>
        <p className="relative mt-4 truncate text-[10px] text-emerald-100/45 sm:text-xs">设备型号：{deviceName || '-'} · 每 5 秒自动刷新实时状态</p>
      </section>
    </div>
  );
}

function getUpdateStateLabel(state: string | undefined) {
  const map: Record<string, string> = {
    '16': '空闲',
    '17': '检查中',
    '32': '有可用更新',
    'unknown': '未知',
  };
  return map[state || 'unknown'] || `状态 ${state}`;
}

function StatusPill({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: 'success' | 'info' | 'muted' }) {
  const toneClass = tone === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-300' : tone === 'info' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300' : 'bg-muted/60 text-muted-foreground';
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-2.5 backdrop-blur-sm sm:gap-3 sm:rounded-2xl sm:p-4">
      <div className={`rounded-full p-2 ${toneClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{label}</p>
        <p className="truncate text-xs font-medium sm:text-sm">{value}</p>
      </div>
    </div>
  );
}

function SummaryTile({ icon, label, value, detail, href }: { icon: ReactNode; label: string; value: string; detail: string; href?: string }) {
  const content = (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/10 p-3 transition hover:bg-white/10 sm:p-4">
      <p className="flex items-center gap-1.5 truncate text-[10px] text-emerald-100/60 sm:text-xs">{icon}{label}</p>
      <p className="mt-2 truncate text-sm font-semibold sm:text-lg">{value}</p>
      <p className="mt-1 truncate text-[10px] text-emerald-50/55 sm:text-xs">{detail}</p>
    </div>
  );

  return href ? <Link href={href} className="block min-w-0">{content}</Link> : content;
}

function formatLastRefresh(value: Date) {
  if (Number.isNaN(value.getTime())) return '-';
  return value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function StatCard({ label, value, color, href }: { label: string; value: string; color: string; href?: string }) {
  const card = (
    <Card className={`card-hover h-full ${href ? 'cursor-pointer transition-transform hover:-translate-y-0.5' : ''}`}>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${color}`}>{value}</div></CardContent>
    </Card>
  );

  return href ? <Link href={href} aria-label={`查看${label}详情`} className="block h-full">{card}</Link> : card;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function SnapshotItem({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  return <div className="space-y-1"><p className="text-xs text-muted-foreground">{label}</p><p className={`truncate font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value || '-'}</p></div>;
}

function getSnapshotValue(source: any, keys: string[]) {
  for (const key of keys) if (source?.[key]) return String(source[key]);
  return '-';
}

function getCarrierName(mccmnc?: string) {
  if (!mccmnc) return '-';
  const value = String(mccmnc).replace(/[^0-9]/g, '');
  const carriers: Record<string, string> = {
    '46000': '中国移动', '46002': '中国移动', '46007': '中国移动', '46008': '中国移动',
    '46001': '中国联通', '46006': '中国联通', '46009': '中国联通',
    '46003': '中国电信', '46005': '中国电信', '46011': '中国电信',
  };
  return carriers[value] || (value.startsWith('460') ? `中国运营商（${value}）` : String(mccmnc));
}

function withUnit(value: string | number | undefined, unit: string) {
  return value === undefined || value === null || value === '' ? '-' : `${value} ${unit}`;
}

function UnitToggle({ unit, onChange }: { unit: 'MB' | 'GB'; onChange: (u: 'MB' | 'GB') => void }) {
  return (
    <div className="flex gap-1">
      <Button size="sm" variant={unit === 'MB' ? 'default' : 'outline'} onClick={() => onChange('MB')}>MB</Button>
      <Button size="sm" variant={unit === 'GB' ? 'default' : 'outline'} onClick={() => onChange('GB')}>GB</Button>
    </div>
  );
}

function DataPlanCard({ startDate, trafficStats }: { startDate: any; trafficStats: any }) {
  const limitBytes = parseInt(startDate.trafficmaxlimit || '0');
  // The quota resets monthly; Current* is only the current WAN session.
  // The router's month_statistics endpoint provides the actual package cycle.
  const monthDownload = parseInt(trafficStats.CurrentMonthDownload || '0');
  const monthUpload = parseInt(trafficStats.CurrentMonthUpload || '0');
  const usedBytes = monthDownload + monthUpload > 0
    ? monthDownload + monthUpload
    : parseInt(trafficStats.CurrentDownload || '0') + parseInt(trafficStats.CurrentUpload || '0');
  const percent = limitBytes > 0 ? Math.min((usedBytes / limitBytes) * 100, 100) : 0;
  const remaining = Math.max(limitBytes - usedBytes, 0);
  const threshold = parseInt(startDate.MonthThreshold || '90');
  const isWarning = percent >= threshold;
  const isOver = percent >= 100;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">已用 / 总量</p>
          <p className="text-2xl font-bold">
            <span className={isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600'}>
              {formatWithUnit(usedBytes, 'GB')}
            </span>
            <span className="text-muted-foreground text-base font-normal"> / {formatWithUnit(limitBytes, 'GB')}</span>
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
            {percent.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">剩余 {formatWithUnit(remaining, 'GB')}</p>
        </div>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${isOver ? 'bg-red-600' : isWarning ? 'bg-yellow-500' : 'bg-blue-600'}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div><p className="text-muted-foreground">日阈值</p><p className="font-medium">{startDate.DayThreshold || 90}%</p></div>
        <div><p className="text-muted-foreground">月阈值</p><p className="font-medium">{startDate.MonthThreshold || 90}%</p></div>
        <div><p className="text-muted-foreground">套餐</p><p className="font-medium">{startDate.DataLimit || '-'}</p></div>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label, description }: { href: string; icon: ReactNode; label: string; description: string }) {
  return (
    <Link href={href}>
      <Card className="card-hover group h-full cursor-pointer py-0">
        <CardContent className="flex min-h-20 items-center gap-4 p-4">
          <div className="shrink-0 rounded-xl bg-muted p-3 transition-colors group-hover:bg-primary/10">{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{label}</p>
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
