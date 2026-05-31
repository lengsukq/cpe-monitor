'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Smartphone, Bell, Settings, ArrowRight } from 'lucide-react';
import TrafficChart from '@/components/TrafficChart';
import { formatBytes, formatRate, formatWithUnit, formatDuration, getSignalQuality } from '@/lib/format';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [trafficStats, setTrafficStats] = useState<any>(null);
  const [unit, setUnit] = useState<'MB' | 'GB'>('GB');
  const [startDate, setStartDate] = useState<any>(null);

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

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/dashboard/overview');
      setOverview(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchTrafficHistory = async () => {
    try {
      const res = await fetch(`/api/dashboard/traffic?range=${timeRange}`);
      setTrafficHistory(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchTrafficStats = async () => {
    try {
      const res = await fetch('/api/dashboard/traffic-stats');
      if (res.ok) setTrafficStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchStartDate = async () => {
    try {
      const res = await fetch('/api/dashboard/start-date');
      if (res.ok) setStartDate(await res.json());
    } catch (e) { console.error(e); }
  };

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

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

function QuickLink({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description: string }) {
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
