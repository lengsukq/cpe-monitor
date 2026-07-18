'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
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
import SignalStrengthCard from '@/components/dashboard/SignalStrengthCard';
import DataPlanCard from '@/components/dashboard/DataPlanCard';
import TrafficStatsPanel from '@/components/dashboard/TrafficStatsPanel';
import TrafficTrendCard from '@/components/dashboard/TrafficTrendCard';
import QuickLinks from '@/components/dashboard/QuickLinks';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatLocalTime, formatRate } from '@/lib/format';

export default function DashboardPage() {
  const data = useDashboardData();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<CollectionReportData | null>(null);

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
        title="仪表盘"
        description="把实时状态、流量、套餐和设备活动集中在一个可操作的监控台里。"
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

      {data.overviewError ? (
        <Callout tone="warning" title="CPE 登录/连接失败">{data.overviewError}</Callout>
      ) : null}

      {data.dataError && !data.overviewError ? (
        <Callout tone="warning" title="部分实时数据不可用">{data.dataError}</Callout>
      ) : null}

      <StatusPillsRow
        isConnected={data.isConnected}
        updateLabel={data.updateLabel}
        updateState={data.overview?.updateState}
        schedulerLabel={data.schedulerStatusLabel}
        schedulerRunning={Boolean(data.overview?.schedulerStatus?.running)}
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricStatCard
          label="下载速率"
          value={formatRate(parseInt(String(data.rate.CurrentDownloadRate || '0'), 10))}
          color="text-brand"
        />
        <MetricStatCard
          label="上传速率"
          value={formatRate(parseInt(String(data.rate.CurrentUploadRate || '0'), 10))}
          color="text-info"
        />
        <MetricStatCard
          href="/device#online-devices"
          label="在线设备"
          value={`${data.overview?.connectedDevices || 0} 台`}
          color="text-success"
        />
        <SignalStrengthCard
          signalStrength={data.overview?.signalStrength}
          signalQuality={data.signalQuality}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrafficStatsPanel
          trafficStats={data.trafficStats}
          unit={data.unit}
          onUnitChange={data.setUnit}
        />
        <Card className="card-hover">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>套餐用量</CardTitle>
              {data.startDate ? (
                <Badge variant="outline">每月 {data.startDate.StartDay || 1} 号重置</Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {data.startDate && data.trafficStats ? (
              <DataPlanCard startDate={data.startDate} trafficStats={data.trafficStats} />
            ) : (
              <Skeleton className="h-32" />
            )}
          </CardContent>
        </Card>
      </div>

      <TrafficTrendCard
        timeRange={data.timeRange}
        onTimeRangeChange={data.setTimeRange}
        data={data.trafficHistory}
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
