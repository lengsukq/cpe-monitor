'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  Mail,
  Search,
  Signal,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  UsersRound,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import ResponsiveDataView from '@/components/ResponsiveDataView';
import {
  OverviewBars,
  OverviewDonut,
  OverviewSparkline,
} from '@/components/overview/OverviewMiniCharts';
import { Callout } from '@/components/Callout';
import DataTableCard from '@/components/DataTableCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { TableHead, TableRow, TableCell } from '@/components/ui/table';
import { apiFetch } from '@/lib/client-api';
import { formatBytes } from '@/lib/format';
import type { DailyReport, DeviceRanking } from '@/types';

interface ReportNotifications {
  emailConfigured: boolean;
  wechatConfigured: boolean;
  emailSent: boolean;
  wechatSent: boolean;
}

interface DailyReportPreview extends DailyReport {
  notifications?: ReportNotifications;
}

function getQualityVariant(quality: string | null) {
  switch (quality) {
    case '优秀': return 'success' as const;
    case '良好': return 'info' as const;
    case '一般': return 'warning' as const;
    case '差': return 'danger' as const;
    case '数据不足': return 'secondary' as const;
    default: return 'secondary' as const;
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [previewReport, setPreviewReport] = useState<DailyReportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [qualityFilter, setQualityFilter] = useState('all');

  async function fetchReports() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<DailyReport[]>('/api/reports/daily', undefined, '获取报告列表失败');
      setReports(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '获取报告列表失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchReports(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function generatePreview() {
    setError('');
    try {
      const data = await apiFetch<DailyReportPreview>(
        '/api/reports/daily',
        { method: 'POST' },
        '生成报告失败',
      );
      setPreviewReport(data);
      setIsOpen(true);

      const notifications = data.notifications;
      if (notifications?.emailSent) {
        toast.success('日报已保存并通过邮件发送', { duration: 4000 });
      } else if (notifications?.wechatSent) {
        toast.success('日报已保存并通过企微发送', { duration: 4000 });
      } else {
        toast.success('日报已保存至数据库', { duration: 3000 });
      }

      await fetchReports();
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : '生成报告失败');
    }
  }

  function openReport(report: DailyReport) {
    setPreviewReport(report);
    setIsOpen(true);
  }

  const topDevices = Array.isArray(previewReport?.topDevices)
    ? (previewReport?.topDevices as DeviceRanking[])
    : [];
  const latestReport = reports[0];
  const recentReports = [...reports].slice(0, 10).reverse();
  const trafficTrend = recentReports.map((report) => (
    (report.totalDownload || 0) + (report.totalUpload || 0)
  ));
  const downloadTrend = recentReports.map((report) => report.totalDownload || 0);
  const signalTrend = recentReports.map((report) => report.avgSignal);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const qualityOptions = Array.from(new Set(
    reports.map((report) => report.networkQuality).filter((value): value is string => Boolean(value)),
  ));
  const visibleReports = reports.filter((report) => {
    const matchesQuery = !normalizedQuery || [
      report.reportDate,
      report.networkQuality,
      report.avgSignal,
    ].join(' ').toLocaleLowerCase().includes(normalizedQuery);
    const matchesQuality = qualityFilter === 'all' || report.networkQuality === qualityFilter;
    return matchesQuery && matchesQuality;
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / report center"
        title="每日报告"
        description="汇总每日流量、峰值时段、网络质量与设备使用排名，便于回顾历史运行情况。"
        icon={<TrendingUp className="h-6 w-6" />}
        actions={<Button onClick={() => { void generatePreview(); }}>生成今日预览</Button>}
      />

      <PageOverview
        eyebrow={<><CalendarDays className="h-3.5 w-3.5" />Reports / daily</>}
        title="报告概览"
        description="历史日报规模与最近一天的流量、质量摘要。"
        items={[
          {
            label: '报告天数',
            value: loading ? '…' : String(reports.length),
            detail: '已生成的历史日报',
            icon: <CalendarDays className="h-3.5 w-3.5" />,
            chart: (
              <OverviewBars
                values={trafficTrend}
                label="最近日报总流量"
                className="text-brand"
              />
            ),
          },
          {
            label: '最近日期',
            value: loading ? '…' : (latestReport?.reportDate || '—'),
            detail: latestReport ? `数据完整率 ${latestReport.uptimePercent?.toFixed(1) || 0}%` : '暂无数据',
            icon: <Wifi className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={latestReport?.uptimePercent || 0}
                total={100}
                label="最近日报数据完整率"
                className="text-success"
              />
            ),
          },
          {
            label: '最近下载',
            value: loading ? '…' : formatBytes(latestReport?.totalDownload ?? null),
            detail: latestReport ? `上传 ${formatBytes(latestReport.totalUpload)}` : '—',
            icon: <Download className="h-3.5 w-3.5" />,
            chart: (
              <OverviewSparkline
                values={downloadTrend}
                label="最近日报下载流量趋势"
                className="text-info"
              />
            ),
          },
          {
            label: '最近质量',
            value: loading ? '…' : (latestReport?.networkQuality || '—'),
            detail: latestReport ? `平均信号 ${latestReport.avgSignal || 0} dBm` : '—',
            icon: <Signal className="h-3.5 w-3.5" />,
            chart: (
              <OverviewSparkline
                values={signalTrend}
                label="最近日报平均信号趋势"
                className="text-warning"
              />
            ),
          },
        ]}
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}

      <section className="app-panel grid gap-3 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center sm:p-4">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索报告日期、网络质量或信号值"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <label className="relative min-w-0">
          <span className="sr-only">网络质量</span>
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={qualityFilter}
            onChange={(event) => setQualityFilter(event.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
          >
            <option value="all">全部网络质量</option>
            {qualityOptions.map((quality) => (
              <option key={quality} value={quality}>{quality}</option>
            ))}
          </select>
        </label>
        <span className="shrink-0 text-center text-xs text-muted-foreground sm:text-left">
          显示 {visibleReports.length} / {reports.length} 天
        </span>
      </section>

      <ResponsiveDataView
        loading={loading}
        isEmpty={visibleReports.length === 0}
        emptyMessage={reports.length === 0 ? '暂无报告记录' : '没有符合条件的报告'}
        mobile={visibleReports.map((report) => {
          const totalTraffic = (report.totalDownload || 0) + (report.totalUpload || 0);
          return (
            <article
              key={report.id}
              className="rounded-[26px] border border-border/65 bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-foreground">{report.reportDate}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    总流量 {formatBytes(totalTraffic)}
                  </p>
                </div>
                <Badge variant={getQualityVariant(report.networkQuality)}>
                  {report.networkQuality || '未评级'}
                </Badge>
              </div>

              <div className="fluid-card-grid mt-4 gap-2 [--fluid-card-min:8.5rem]">
                <div className="rounded-2xl bg-brand/10 p-3">
                  <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Download className="h-3 w-3 text-brand" />
                    总下载
                  </p>
                  <p className="mt-1 text-sm font-bold text-brand">
                    {formatBytes(report.totalDownload)}
                  </p>
                </div>
                <div className="rounded-2xl bg-info/10 p-3">
                  <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <Upload className="h-3 w-3 text-info" />
                    总上传
                  </p>
                  <p className="mt-1 text-sm font-bold text-info">
                    {formatBytes(report.totalUpload)}
                  </p>
                </div>
              </div>

              <div className="fluid-card-grid mt-3 gap-2 text-center [--fluid-card-min:6.75rem]">
                <div className="rounded-2xl bg-muted/35 p-2.5">
                  <Clock3 className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                  <p className="mt-1 text-xs font-bold">
                    {report.peakHour !== null ? `${report.peakHour}:00` : '—'}
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">峰值时段</p>
                </div>
                <div className="rounded-2xl bg-muted/35 p-2.5">
                  <Signal className="mx-auto h-3.5 w-3.5 text-warning" />
                  <p className="mt-1 text-xs font-bold">{report.avgSignal ?? '—'} dBm</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">平均信号</p>
                </div>
                <div className="rounded-2xl bg-muted/35 p-2.5">
                  <Wifi className="mx-auto h-3.5 w-3.5 text-success" />
                  <p className="mt-1 text-xs font-bold">
                    {report.uptimePercent?.toFixed(1) || 0}%
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">完整率</p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full rounded-xl"
                onClick={() => openReport(report)}
              >
                <Eye className="mr-2 h-4 w-4" />
                查看日报详情
              </Button>
            </article>
          );
        })}
        desktop={(
          <DataTableCard
            colSpan={8}
            loading={loading}
            isEmpty={visibleReports.length === 0}
            emptyMessage={reports.length === 0 ? '暂无报告记录' : '没有符合条件的报告'}
            columns={
              <>
                <TableHead>日期</TableHead>
                <TableHead>总下载</TableHead>
                <TableHead>总上传</TableHead>
                <TableHead>峰值时段</TableHead>
                <TableHead>平均信号</TableHead>
                <TableHead>网络质量</TableHead>
                <TableHead>数据完整率</TableHead>
                <TableHead>操作</TableHead>
              </>
            }
          >
            {visibleReports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>{report.reportDate}</TableCell>
                <TableCell>{formatBytes(report.totalDownload)}</TableCell>
                <TableCell>{formatBytes(report.totalUpload)}</TableCell>
                <TableCell>{report.peakHour !== null ? `${report.peakHour}:00` : '-'}</TableCell>
                <TableCell>{report.avgSignal ?? '—'} dBm</TableCell>
                <TableCell>
                  <Badge variant={getQualityVariant(report.networkQuality)}>
                    {report.networkQuality || '-'}
                  </Badge>
                </TableCell>
                <TableCell>{report.uptimePercent?.toFixed(1) || 0}%</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={() => openReport(report)}>
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    详情
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </DataTableCard>
        )}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto rounded-[28px] p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">日报详情</DialogTitle>
                <DialogDescription>
                  {previewReport?.reportDate || ''}
                </DialogDescription>
              </div>
            </div>
            <div className="mt-2">
              <Badge
                variant="default"
                className="gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/15"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                日报概览
              </Badge>
            </div>
          </DialogHeader>

          {previewReport ? (
            <div className="space-y-5">
              {/* Metric cards row */}
              <div className="fluid-card-grid gap-3 [--fluid-card-min:8rem]">
                <div className="rounded-lg border bg-card p-3 text-center">
                  <Download className="mx-auto mb-1.5 h-4 w-4 text-brand" />
                  <div className="text-2xl font-bold tabular-nums text-brand">
                    {formatBytes(previewReport.totalDownload)}
                  </div>
                  <div className="text-xs text-muted-foreground">总下载</div>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <TrendingUp className="mx-auto mb-1.5 h-4 w-4 text-info" />
                  <div className="text-2xl font-bold tabular-nums text-info">
                    {formatBytes(previewReport.totalUpload)}
                  </div>
                  <div className="text-xs text-muted-foreground">总上传</div>
                </div>
                <div className="rounded-lg border bg-card p-3 text-center">
                  <Activity className="mx-auto mb-1.5 h-4 w-4 text-warning" />
                  <div className="text-2xl font-bold tabular-nums">
                    {previewReport.peakHour !== null ? `${previewReport.peakHour}:00` : '-'}
                  </div>
                  <div className="text-xs text-muted-foreground">峰值时段</div>
                </div>
              </div>

              <div className="fluid-card-grid gap-2 [--fluid-card-min:8rem]">
                <div className="rounded-2xl bg-muted/35 p-3">
                  <Activity className="h-4 w-4 text-brand" />
                  <p className="mt-2 text-lg font-bold tabular-nums">
                    {previewReport.sampleCount ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">采样点</p>
                </div>
                <div className="rounded-2xl bg-muted/35 p-3">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <p className="mt-2 text-lg font-bold tabular-nums">
                    {previewReport.successfulCollections ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">成功采集</p>
                </div>
                <div className="rounded-2xl bg-muted/35 p-3">
                  <UsersRound className="h-4 w-4 text-info" />
                  <p className="mt-2 text-lg font-bold tabular-nums">
                    {previewReport.averageDevices?.toFixed(1) ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">平均设备数</p>
                </div>
                <div className="rounded-2xl bg-muted/35 p-3">
                  <Signal className="h-4 w-4 text-warning" />
                  <p className="mt-2 text-lg font-bold tabular-nums">
                    {previewReport.alertCount ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">告警次数</p>
                </div>
              </div>

              {/* Device ranking */}
              <div className="rounded-lg border bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  设备使用排名
                </h3>
                {topDevices.length > 0 ? (
                  <div className="space-y-2.5">
                    {topDevices.slice(0, 10).map((device, index) => {
                      const maxTotal = Math.max(...topDevices.map((d) => d.totalBytes));
                      const pct = maxTotal > 0 ? Math.round((device.totalBytes / maxTotal) * 100) : 0;
                      return (
                        <div key={device.mac || index} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
                          <span className="pt-0.5 text-center text-xs font-medium text-muted-foreground">
                            {index + 1}
                          </span>
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex min-w-0 items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm text-muted-foreground" title={device.name}>
                                  {device.name}
                                </p>
                                <p className="truncate text-[10px] text-muted-foreground/60" title={device.ip}>
                                  {device.ip}
                                </p>
                              </div>
                              <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                {formatBytes(device.totalBytes)}
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">暂无设备数据</p>
                )}
              </div>

              {/* Quality & signal row */}
              <div className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2">
                    <Signal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">网络质量</span>
                    <Badge variant={getQualityVariant(previewReport.networkQuality)} className="rounded-full">
                      {previewReport.networkQuality || '-'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">平均信号</span>
                    <span className="text-sm font-medium tabular-nums">{previewReport.avgSignal || 0} dBm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">数据完整率</span>
                    <span className="text-sm font-medium tabular-nums">{previewReport.uptimePercent?.toFixed(1) || 0}%</span>
                  </div>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/60">
                  数据完整率 = 实际采集次数 ÷ 预期采集次数（基于调度间隔计算）。
                  若刚开启调度器或采集时间尚短，完整率偏低属正常现象，随着时间推移会逐步提升。
                  网络质量综合信号强度与数据完整率评定。
                </p>
              </div>

              {/* Notification status */}
              {previewReport.notifications && (
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">通知发送</span>
                    {previewReport.notifications.emailSent ? (
                      <Badge variant="default" className="gap-1 rounded-full bg-success/10 text-success hover:bg-success/15">
                        <CheckCircle2 className="h-3 w-3" />
                        邮件已发送
                      </Badge>
                    ) : previewReport.notifications.emailConfigured ? (
                      <Badge variant="outline" className="gap-1 rounded-full text-destructive">
                        邮件发送失败
                      </Badge>
                    ) : null}
                    {previewReport.notifications.wechatSent ? (
                      <Badge variant="default" className="gap-1 rounded-full bg-info/10 text-info hover:bg-info/15">
                        <CheckCircle2 className="h-3 w-3" />
                        企微已发送
                      </Badge>
                    ) : previewReport.notifications.wechatConfigured ? (
                      <Badge variant="outline" className="gap-1 rounded-full text-destructive">
                        企微发送失败
                      </Badge>
                    ) : null}
                    {!previewReport.notifications.emailConfigured && !previewReport.notifications.wechatConfigured && (
                      <span className="text-xs text-muted-foreground/60">
                        未配置通知渠道，请前往设置页配置邮件或企微通知
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-4 -mb-4 flex border-t border-border/70 bg-background/95 p-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:justify-end sm:p-6">
            <Button className="w-full sm:w-auto" onClick={() => setIsOpen(false)} variant="outline">
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
