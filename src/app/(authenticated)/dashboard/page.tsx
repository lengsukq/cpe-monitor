'use client';

import { useState } from 'react';
import { Download, DownloadCloud, Gauge, PackageOpen, RadioTower, UploadCloud, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { Callout } from '@/components/Callout';
import { PageShell } from '@/components/PageShell';
import { LoadingBlock } from '@/components/LoadingBlock';
import RefreshButton from '@/components/RefreshButton';
import { CollectionReportDialog, type CollectionReportData } from '@/components/dashboard/CollectionReportDialog';
import DashboardHero from '@/components/dashboard/DashboardHero';
import StatusPillsRow from '@/components/dashboard/StatusPillsRow';
import CellSnapshotCard from '@/components/dashboard/CellSnapshotCard';
import SchedulerCard from '@/components/dashboard/SchedulerCard';
import MetricStatCard from '@/components/dashboard/MetricStatCard';
import DataPlanCard from '@/components/dashboard/DataPlanCard';
import TrafficStatsPanel from '@/components/dashboard/TrafficStatsPanel';
import TrafficTrendCard from '@/components/dashboard/TrafficTrendCard';
import NetworkHistoryGrid from '@/components/dashboard/NetworkHistoryGrid';
import QuickLinks from '@/components/dashboard/QuickLinks';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatBytesPerSecond, formatLocalTime } from '@/lib/format';

export default function DashboardPage() {
  const data = useDashboardData();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<CollectionReportData | null>(null);
  const signalBadgeVariant = (
    data.signalQuality?.variant === 'success'
      || data.signalQuality?.variant === 'info'
      || data.signalQuality?.variant === 'warning'
      || data.signalQuality?.variant === 'danger'
  ) ? data.signalQuality.variant : 'secondary';

  if (data.loading) {
    return (
      <PageShell>
        <LoadingBlock />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / live console"
        title="网络仪表盘"
        description="把实时状态、流量、套餐和设备活动集中在一个可操作的监控台里。"
        icon={<Gauge className="h-6 w-6" />}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="order-last text-xs text-muted-foreground sm:order-first">
              {data.lastRefreshAt
                ? `更新于 ${formatLocalTime(data.lastRefreshAt)}`
                : '正在同步'}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={data.overview?.source === 'cpe' ? 'default' : 'secondary'}
                className="rounded-full px-3 py-1"
              >
                {data.overview?.source === 'cpe' ? '实时 CPE 数据' : '数据库兜底数据'}
              </Badge>
              <RefreshButton
                onClick={() => { void data.refreshDashboard(); }}
                loading={data.refreshing}
                label="刷新数据"
                loadingLabel="刷新中"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={data.collecting}
                onClick={async () => {
                  try {
                    const result = await data.collectNow();
                    setReportData(result);
                    setReportOpen(true);
                    if (result.success) {
                      // Refresh dashboard to show newly collected data
                      await data.refreshDashboard();
                    }
                  } catch {
                    toast.error('采集请求失败，请检查网络连接', { duration: 4000 });
                  }
                }}
              >
                <Download className="mr-1 h-4 w-4" />
                {data.collecting ? '采集中...' : '立即采集'}
              </Button>
            </div>
          </div>
        }
      />

      {data.overviewError ? (
        <Callout tone="warning" title="CPE 登录/连接失败">{data.overviewError}</Callout>
      ) : null}

      {data.dataError && !data.overviewError ? (
        <Callout tone="warning" title="部分实时数据不可用">{data.dataError}</Callout>
      ) : null}

      {data.overview?.collectionHealth?.status === 'failed' ? (
        <Callout tone="danger" title="最近一次采集失败">
          {data.overview.collectionHealth.detail}
          {data.overview.collectionHealth.consecutiveFailures > 1
            ? `，已连续失败 ${data.overview.collectionHealth.consecutiveFailures} 次`
            : ''}
        </Callout>
      ) : data.overview?.collectionHealth?.status === 'stale' ? (
        <Callout tone="warning" title="采集数据已过期">
          {data.overview.collectionHealth.detail}，请检查定时任务或手动执行一次采集。
        </Callout>
      ) : null}

      <StatusPillsRow
        isConnected={data.isConnected}
        updateLabel={data.updateLabel}
        updateState={data.overview?.updateState}
        schedulerLabel={data.schedulerStatusLabel}
        schedulerRunning={Boolean(data.overview?.schedulerStatus?.running)}
        collectionHealthLabel={data.overview?.collectionHealth?.label || '未知'}
        collectionHealthStatus={data.overview?.collectionHealth?.status || 'never'}
      />

      <div className="fluid-card-grid gap-4 [--fluid-card-min:15rem]">
        <MetricStatCard
          index={0}
          label="下载速率"
          value={formatBytesPerSecond(parseInt(String(data.rate.CurrentDownloadRate || '0'), 10))}
          color="text-brand"
          icon={<DownloadCloud className="h-5 w-5" />}
          hint="实时下行"
          points={data.metricHistory.map((point) => point.downloadBps)}
        />
        <MetricStatCard
          index={1}
          label="上传速率"
          value={formatBytesPerSecond(parseInt(String(data.rate.CurrentUploadRate || '0'), 10))}
          color="text-info"
          icon={<UploadCloud className="h-5 w-5" />}
          hint="实时上行"
          points={data.metricHistory.map((point) => point.uploadBps)}
        />
        <MetricStatCard
          index={2}
          href="/device#online-devices"
          label="在线设备"
          value={`${data.overview?.connectedDevices || 0} 台`}
          color="text-success"
          icon={<UsersRound className="h-5 w-5" />}
          hint="点击查看终端列表"
          points={data.metricHistory.map((point) => point.connectedDevices)}
        />
        <MetricStatCard
          index={3}
          href="/device"
          label="信号强度"
          value={`${data.overview?.signalStrength ?? 0} dBm`}
          color="text-warning"
          icon={<RadioTower className="h-5 w-5" />}
          hint="蜂窝网络信号"
          badge={data.signalQuality ? (
            <Badge variant={signalBadgeVariant}>{data.signalQuality.label}</Badge>
          ) : null}
          points={data.metricHistory.map((point) => point.rsrp ?? point.signalStrength)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,.75fr)]">
        <TrafficTrendCard
          timeRange={data.timeRange}
          onTimeRangeChange={data.setTimeRange}
          data={data.trafficHistory}
        />
        <Card className="card-hover">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="metric-icon size-9 rounded-xl"><PackageOpen className="h-4 w-4" /></span>
                套餐用量
              </CardTitle>
              {data.startDate ? (
                <Badge variant="outline">每月 {data.startDate.StartDay || 1} 号重置</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {data.startDate && data.trafficStats ? (
              <DataPlanCard startDate={data.startDate} trafficStats={data.trafficStats} />
            ) : (
              <Skeleton className="h-64 rounded-3xl" />
            )}
          </CardContent>
        </Card>
      </div>

      <NetworkHistoryGrid data={data.trafficHistory} />

      <DashboardHero
        isConnected={data.isConnected}
        source={data.overview?.source}
        connectedDevices={data.overview?.connectedDevices || 0}
        cellId={data.cell.cellId}
        networkType={data.cell.networkType || data.overview?.networkType}
        carrierCode={String(data.deviceSnapshot?.deviceInformation?.Mccmnc || '')}
        signalStrength={data.overview?.signalStrength}
        signalLabel={data.signalQuality?.label}
        smsSyncLabel={data.smsSyncLabel}
        smsSyncDetail={data.smsSyncDetail}
        deviceName={data.deviceName}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <CellSnapshotCard
          networkType={data.overview?.networkType}
          connectionStatus={data.overview?.connectionStatus}
          deviceName={data.deviceName}
          carrierCode={String(data.deviceSnapshot?.deviceInformation?.Mccmnc || '')}
          cell={data.cell}
        />
        <SchedulerCard
          enabled={Boolean(data.overview?.schedulerStatus?.enabled)}
          interval={data.overview?.schedulerStatus?.interval || 60}
          running={Boolean(data.overview?.schedulerStatus?.running)}
          saving={data.schedulerSaving}
          onToggle={(enabled) => { void data.updateScheduler(enabled); }}
          onIntervalChange={(interval) => {
            void data.updateScheduler(Boolean(data.overview?.schedulerStatus?.enabled), interval);
          }}
        />
      </div>

      <TrafficStatsPanel
        trafficStats={data.trafficStats}
        unit={data.unit}
        onUnitChange={data.setUnit}
      />

      <QuickLinks />

      <CollectionReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        data={reportData}
      />
    </PageShell>
  );
}
