'use client';

import { useEffect, useState } from 'react';
import { Activity, CalendarDays, CheckCircle2, Download, Eye, Mail, Signal, TrendingUp, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import { Callout } from '@/components/Callout';
import DataTableCard from '@/components/DataTableCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { TableHead, TableRow, TableCell } from '@/components/ui/table';
import { apiFetch } from '@/lib/client-api';
import { formatBytes } from '@/lib/format';
import type { DailyReport, DeviceRanking } from '@/types';

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
  const [previewReport, setPreviewReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchReports();
  }, []);

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

  async function generatePreview() {
    setError('');
    try {
      const data = await apiFetch<DailyReport & {
        notifications?: {
          emailConfigured: boolean;
          wechatConfigured: boolean;
          emailSent: boolean;
          wechatSent: boolean;
        };
      }>('/api/reports/daily', { method: 'POST' }, '生成报告失败');
      setPreviewReport(data);
      setIsOpen(true);

      // Show notification status
      const notifications = data.notifications;
      if (notifications?.emailSent) {
        toast.success('日报已保存并通过邮件发送', { duration: 4000 });
      } else if (notifications?.wechatSent) {
        toast.success('日报已保存并通过企微发送', { duration: 4000 });
      } else {
        toast.success('日报已保存至数据库', { duration: 3000 });
      }

      // Refresh the report list
      await fetchReports();
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : '生成报告失败');
    }
  }

  const topDevices = Array.isArray(previewReport?.topDevices)
    ? (previewReport?.topDevices as DeviceRanking[])
    : [];
  const latestReport = reports[0];

  return (
    <PageShell>
      <PageHeader
        title="每日报告"
        description="汇总每日流量、峰值时段、网络质量与设备使用排名，便于回顾历史运行情况。"
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
          },
          {
            label: '最近日期',
            value: loading ? '…' : (latestReport?.reportDate || '—'),
            detail: latestReport ? `数据完整率 ${latestReport.uptimePercent?.toFixed(1) || 0}%` : '暂无数据',
            icon: <Wifi className="h-3.5 w-3.5" />,
          },
          {
            label: '最近下载',
            value: loading ? '…' : formatBytes(latestReport?.totalDownload ?? null),
            detail: latestReport ? `上传 ${formatBytes(latestReport.totalUpload)}` : '—',
            icon: <Download className="h-3.5 w-3.5" />,
          },
          {
            label: '最近质量',
            value: loading ? '…' : (latestReport?.networkQuality || '—'),
            detail: latestReport ? `平均信号 ${latestReport.avgSignal || 0} dBm` : '—',
            icon: <Signal className="h-3.5 w-3.5" />,
          },
        ]}
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}

      <DataTableCard
        colSpan={7}
        loading={loading}
        isEmpty={reports.length === 0}
        emptyMessage="暂无报告记录"
        columns={
          <>
            <TableHead>日期</TableHead>
            <TableHead>总下载</TableHead>
            <TableHead>总上传</TableHead>
            <TableHead>峰值时段</TableHead>
            <TableHead>平均信号</TableHead>
            <TableHead>网络质量</TableHead>
            <TableHead>数据完整率</TableHead>
          </>
        }
      >
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell>{report.reportDate}</TableCell>
            <TableCell>{formatBytes(report.totalDownload)}</TableCell>
            <TableCell>{formatBytes(report.totalUpload)}</TableCell>
            <TableCell>{report.peakHour !== null ? `${report.peakHour}:00` : '-'}</TableCell>
            <TableCell>{report.avgSignal || 0} dBm</TableCell>
            <TableCell>
              <Badge variant={getQualityVariant(report.networkQuality)}>
                {report.networkQuality || '-'}
              </Badge>
            </TableCell>
            <TableCell>{report.uptimePercent?.toFixed(1) || 0}%</TableCell>
          </TableRow>
        ))}
      </DataTableCard>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">今日报告预览</DialogTitle>
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
              <div className="grid grid-cols-3 gap-3">
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
                        <div key={device.mac || index} className="flex items-center gap-3">
                          <span className="w-5 text-center text-xs font-medium text-muted-foreground">
                            {index + 1}
                          </span>
                          <span className="w-20 truncate text-sm text-muted-foreground" title={device.name}>
                            {device.name}
                          </span>
                          <span className="hidden w-20 truncate text-xs text-muted-foreground/60 sm:block" title={device.ip}>
                            {device.ip}
                          </span>
                          <div className="flex flex-1 items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">
                              {formatBytes(device.totalBytes)}
                            </span>
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
              {(previewReport as any)?.notifications && (
                <div className="rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">通知发送</span>
                    {(previewReport as any).notifications.emailSent ? (
                      <Badge variant="default" className="gap-1 rounded-full bg-success/10 text-success hover:bg-success/15">
                        <CheckCircle2 className="h-3 w-3" />
                        邮件已发送
                      </Badge>
                    ) : (previewReport as any).notifications.emailConfigured ? (
                      <Badge variant="outline" className="gap-1 rounded-full text-destructive">
                        邮件发送失败
                      </Badge>
                    ) : null}
                    {(previewReport as any).notifications.wechatSent ? (
                      <Badge variant="default" className="gap-1 rounded-full bg-info/10 text-info hover:bg-info/15">
                        <CheckCircle2 className="h-3 w-3" />
                        企微已发送
                      </Badge>
                    ) : (previewReport as any).notifications.wechatConfigured ? (
                      <Badge variant="outline" className="gap-1 rounded-full text-destructive">
                        企微发送失败
                      </Badge>
                    ) : null}
                    {!(previewReport as any).notifications.emailConfigured && !(previewReport as any).notifications.wechatConfigured && (
                      <span className="text-xs text-muted-foreground/60">
                        未配置通知渠道，请前往设置页配置邮件或企微通知
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <div className="-mx-4 -mb-4 flex justify-end rounded-b-xl border-t bg-muted/50 p-4">
            <Button onClick={() => setIsOpen(false)} variant="outline">
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
