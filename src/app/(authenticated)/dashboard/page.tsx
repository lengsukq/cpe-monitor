'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Smartphone, Bell, Settings, ArrowRight, Activity, RefreshCw, Wifi } from 'lucide-react';
import TrafficChart from '@/components/TrafficChart';
import { formatRate, formatWithUnit, formatDuration, getSignalQuality } from '@/lib/format';

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

  async function fetchOverview() {
    try {
      const res = await fetch('/api/dashboard/overview');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取概览失败');
      setOverview(data);
      setOverviewError(data.cpeError || '');
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

  useEffect(() => {
    fetchOverview();
    fetchTrafficHistory();
    fetchTrafficStats();
    fetchStartDate();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">仪表盘</h1>
          <p className="text-sm text-muted-foreground">复用实时速率、在线状态、升级状态和采集配置接口展示 CPE 运行概览</p>
        </div>
        <Badge variant={overview?.source === 'cpe' ? 'default' : 'secondary'} className="w-fit rounded-full px-3 py-1">
          {overview?.source === 'cpe' ? '实时 CPE 数据' : '数据库兜底数据'}
        </Badge>
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
        <CardContent className="grid gap-4 pt-6 md:grid-cols-3">
          <StatusPill icon={<Wifi className="h-4 w-4" />} label="蜂窝连接" value={isConnected ? '已连接' : '未连接/未知'} tone={isConnected ? 'success' : 'muted'} />
          <StatusPill icon={<RefreshCw className="h-4 w-4" />} label="升级状态" value={updateLabel} tone={overview?.updateState === 'unknown' ? 'muted' : 'info'} />
          <StatusPill icon={<Activity className="h-4 w-4" />} label="定时采集" value={overview?.schedulerStatus?.running ? '运行中' : overview?.schedulerStatus?.enabled ? `每 ${overview.schedulerStatus.interval} 分钟` : '未启用'} tone={overview?.schedulerStatus?.running ? 'success' : 'muted'} />
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="下载速率" value={formatRate(parseInt(rate.CurrentDownloadRate || '0'))} color="text-blue-600" />
        <StatCard label="上传速率" value={formatRate(parseInt(rate.CurrentUploadRate || '0'))} color="text-purple-600" />
        <StatCard label="在线设备" value={`${overview?.connectedDevices || 0} 台`} color="text-green-600" />
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
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-4 backdrop-blur-sm">
      <div className={`rounded-full p-2 ${toneClass}`}>{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className={`text-2xl font-bold ${color}`}>{value}</div></CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
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
  const usedBytes = parseInt(trafficStats.TotalDownload || '0') + parseInt(trafficStats.TotalUpload || '0');
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
      <Card className="card-hover cursor-pointer group">
        <CardContent className="pt-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">{icon}</div>
          <div className="flex-1">
            <p className="font-medium">{label}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </CardContent>
      </Card>
    </Link>
  );
}
