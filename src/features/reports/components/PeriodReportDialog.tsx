'use client';

import {
  Activity,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Download,
  Eye,
  Flame,
  Signal,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatAppDateTime } from '@/lib/date-time';
import { formatBytes } from '@/lib/format';
import type { DeviceRanking } from '@/types';
import { getReportQualityVariant } from '../model';
import { DeviceRankingList } from './DeviceRankingList';

export interface PeriodDailyBreakdownItem {
  date: string;
  upload: number;
  download: number;
  total: number;
  avgSignal: number | null;
  sampleCount: number;
}

export interface PeriodReportItem {
  id: number;
  periodKey: string;
  periodType: 'weekly' | 'monthly';
  startDate: string | null;
  endDate: string | null;
  totalUpload: number;
  totalDownload: number;
  topDevices: DeviceRanking[];
  avgSignal: number | null;
  networkQuality: string | null;
  createdAt: string | null;
  dailyAvgUpload?: number;
  dailyAvgDownload?: number;
  peakDay?: string | null;
  peakDayTraffic?: number;
  dayCount?: number;
  totalDays?: number;
  dailyBreakdown?: PeriodDailyBreakdownItem[];
}

interface PeriodReportDialogProps {
  open: boolean;
  report: PeriodReportItem | null;
  loadingDetail: boolean;
  detailError: string;
  onOpenChange: (open: boolean) => void;
}

function formatDayShortLabel(dateKey: string): string {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  const weekday = Number.isNaN(date.getTime())
    ? ''
    : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getUTCDay()];
  return `${parts[1]}-${parts[2]}${weekday ? ` (${weekday})` : ''}`;
}

export function PeriodReportDialog({
  open,
  report,
  loadingDetail,
  detailError,
  onOpenChange,
}: PeriodReportDialogProps) {
  const isWeekly = report?.periodType === 'weekly';
  const PeriodIcon = isWeekly ? CalendarDays : CalendarRange;
  const titleLabel = isWeekly ? '周报详情' : '月报详情';
  const totalBytes = (report?.totalDownload || 0) + (report?.totalUpload || 0);
  const dailyAvgTotal = (report?.dailyAvgDownload || 0) + (report?.dailyAvgUpload || 0);
  const breakdown = report?.dailyBreakdown ?? [];
  const activeBreakdown = breakdown.filter((item) => item.sampleCount > 0 || item.total > 0);
  const maxDailyTotal = Math.max(0, ...breakdown.map((item) => item.total));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-3xl overflow-y-auto rounded-[28px] p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{titleLabel}</DialogTitle>
              <DialogDescription>
                {report?.periodKey || ''}
                {report?.startDate && report?.endDate ? ` · ${report.startDate} 至 ${report.endDate}` : ''}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="default" className="gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/15">
              <PeriodIcon className="h-3.5 w-3.5" />
              {isWeekly ? '周度汇总' : '月度汇总'}
            </Badge>
            {report?.createdAt ? (
              <span className="text-xs text-muted-foreground">
                生成于 {formatAppDateTime(report.createdAt, { second: undefined })}
              </span>
            ) : null}
          </div>
        </DialogHeader>

        {report ? (
          <div className="space-y-5">
            <div className="fluid-card-grid gap-3 [--fluid-card-min:8rem]">
              <div className="rounded-lg border bg-card p-3 text-center">
                <Download className="mx-auto mb-1.5 h-4 w-4 text-brand" />
                <div className="text-xl font-bold tabular-nums text-brand sm:text-2xl">
                  {formatBytes(report.totalDownload)}
                </div>
                <div className="text-xs text-muted-foreground">总下载</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <TrendingUp className="mx-auto mb-1.5 h-4 w-4 text-info" />
                <div className="text-xl font-bold tabular-nums text-info sm:text-2xl">
                  {formatBytes(report.totalUpload)}
                </div>
                <div className="text-xs text-muted-foreground">总上传</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <BarChart3 className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <div className="text-xl font-bold tabular-nums sm:text-2xl">
                  {formatBytes(totalBytes)}
                </div>
                <div className="text-xs text-muted-foreground">总流量</div>
              </div>
            </div>

            <div className="fluid-card-grid gap-2 [--fluid-card-min:8.5rem]">
              <div className="rounded-2xl bg-muted/35 p-3">
                <Activity className="h-4 w-4 text-brand" />
                <p className="mt-2 text-base font-bold tabular-nums">
                  {loadingDetail && report.dailyAvgDownload === undefined ? '计算中…' : formatBytes(dailyAvgTotal)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  日均总流量（下 {formatBytes(report.dailyAvgDownload || 0)} / 上 {formatBytes(report.dailyAvgUpload || 0)}）
                </p>
              </div>
              <div className="rounded-2xl bg-muted/35 p-3">
                <Flame className="h-4 w-4 text-warning" />
                <p className="mt-2 text-base font-bold tabular-nums">
                  {report.peakDay ? formatDayShortLabel(report.peakDay) : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  峰值日{report.peakDayTraffic ? ` (${formatBytes(report.peakDayTraffic)})` : ''}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/35 p-3">
                <PeriodIcon className="h-4 w-4 text-info" />
                <p className="mt-2 text-base font-bold tabular-nums">
                  {report.dayCount !== undefined && report.totalDays !== undefined
                    ? `${report.dayCount} / ${report.totalDays} 天`
                    : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">有采样覆盖天数</p>
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  逐日流量明细
                </h3>
                {activeBreakdown.length > 0 ? (
                  <span className="text-xs text-muted-foreground">共 {activeBreakdown.length} 天有流量记录</span>
                ) : null}
              </div>
              {loadingDetail && breakdown.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">正在加载每日流量明细…</p>
              ) : detailError ? (
                <p className="py-4 text-center text-xs text-destructive">{detailError}</p>
              ) : activeBreakdown.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  该周期未保留逐日原始采样，已展示历史汇总与设备排名。
                </p>
              ) : (
                <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                  {breakdown.map((day) => {
                    const widthPct = maxDailyTotal > 0 ? Math.round((day.total / maxDailyTotal) * 100) : 0;
                    const downloadPct = day.total > 0 ? Math.round((day.download / day.total) * 100) : 0;
                    return (
                      <div key={day.date} className="space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-foreground">{formatDayShortLabel(day.date)}</span>
                          <div className="flex items-center gap-3 tabular-nums text-muted-foreground">
                            <span>下 {formatBytes(day.download)}</span>
                            <span>上 {formatBytes(day.upload)}</span>
                            {day.avgSignal !== null ? <span>{day.avgSignal} dBm</span> : null}
                            <span className="font-medium text-foreground">{formatBytes(day.total)}</span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          {day.total > 0 ? (
                            <div className="flex h-full overflow-hidden rounded-full" style={{ width: `${widthPct}%` }}>
                              <div className="h-full bg-brand" style={{ width: `${downloadPct}%` }} />
                              <div className="h-full flex-1 bg-info" />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                <Activity className="h-4 w-4 text-muted-foreground" />
                设备使用排名 TOP 10
              </h3>
              <DeviceRankingList devices={report.topDevices || []} />
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <Signal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">网络质量</span>
                  <Badge variant={getReportQualityVariant(report.networkQuality)} className="rounded-full">
                    {report.networkQuality || '-'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">平均信号</span>
                  <span className="text-sm font-medium tabular-nums">
                    {report.avgSignal !== null ? `${report.avgSignal} dBm` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-4 -mb-4 flex border-t border-border/70 bg-background/95 p-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:justify-end sm:p-6">
          <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)} variant="outline">
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
