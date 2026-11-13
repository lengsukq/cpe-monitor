'use client';

import { useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Download,
  Flame,
  Signal,
  Upload,
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
import { cn } from '@/lib/utils';
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

function formatDayShort(dateKey: string): { mmdd: string; weekday: string } {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return { mmdd: dateKey, weekday: '' };
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  const weekday = Number.isNaN(date.getTime())
    ? ''
    : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getUTCDay()];
  return { mmdd: `${parts[1]}-${parts[2]}`, weekday };
}

export function PeriodReportDialog({
  open,
  report,
  loadingDetail,
  detailError,
  onOpenChange,
}: PeriodReportDialogProps) {
  const [showAllDays, setShowAllDays] = useState(false);

  const isWeekly = report?.periodType === 'weekly';
  const PeriodIcon = isWeekly ? CalendarDays : CalendarRange;
  const titleLabel = isWeekly ? '周报详情' : '月报详情';

  const totalDownload = report?.totalDownload || 0;
  const totalUpload = report?.totalUpload || 0;
  const totalBytes = totalDownload + totalUpload;
  const downloadRatio = totalBytes > 0 ? Math.round((totalDownload / totalBytes) * 100) : 0;
  const uploadRatio = totalBytes > 0 ? 100 - downloadRatio : 0;
  const dailyAvgTotal = (report?.dailyAvgDownload || 0) + (report?.dailyAvgUpload || 0);

  const breakdown = report?.dailyBreakdown ?? [];
  const activeDays = breakdown.filter((item) => item.sampleCount > 0 || item.total > 0);
  const maxDailyTotal = Math.max(0, ...breakdown.map((item) => item.total));
  const peakInfo = report?.peakDay ? formatDayShort(report.peakDay) : null;
  const visibleRows = showAllDays || activeDays.length <= 7 ? activeDays : activeDays.slice(0, 7);

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!next) setShowAllDays(false);
      onOpenChange(next);
    }}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-2xl sm:p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-card px-5 pt-5 pb-4 pr-11 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/12 text-brand">
              <PeriodIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-base font-semibold sm:text-lg">{titleLabel}</DialogTitle>
                {report?.periodKey ? (
                  <Badge variant="secondary" className="rounded-full font-mono text-xs">
                    {report.periodKey}
                  </Badge>
                ) : null}
              </div>
              <DialogDescription className="mt-0.5 text-xs">
                {report?.startDate && report?.endDate
                  ? `${report.startDate} ~ ${report.endDate}`
                  : ''}
                {report?.createdAt
                  ? ` · 生成于 ${formatAppDateTime(report.createdAt, { second: undefined })}`
                  : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {report ? (
            <>
              {/* Hero total traffic summary */}
              <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-brand/10 via-card to-info/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">周期总流量</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
                      {formatBytes(totalBytes)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {report.dayCount !== undefined && report.totalDays !== undefined ? (
                      <Badge variant="outline" className="rounded-full bg-card/80 text-xs font-normal">
                        覆盖 {report.dayCount}/{report.totalDays} 天
                      </Badge>
                    ) : null}
                    {report.avgSignal !== null ? (
                      <Badge variant="outline" className="gap-1 rounded-full bg-card/80 text-xs font-normal">
                        <Signal className="h-3 w-3 text-muted-foreground" />
                        {report.avgSignal} dBm
                      </Badge>
                    ) : null}
                    <Badge variant={getReportQualityVariant(report.networkQuality)} className="rounded-full text-xs">
                      {report.networkQuality || '-'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-3.5 space-y-1.5">
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/80">
                    {totalBytes > 0 ? (
                      <>
                        <div className="h-full bg-brand transition-all" style={{ width: `${downloadRatio}%` }} />
                        <div className="h-full bg-info transition-all" style={{ width: `${uploadRatio}%` }} />
                      </>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-brand" />
                      下载 {downloadRatio}%
                    </span>
                    <span className="flex items-center gap-1.5">
                      上传 {uploadRatio}%
                      <span className="h-2 w-2 rounded-full bg-info" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Balanced 2x2 (mobile) / 4-col (desktop) KPI grid */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Download className="h-3.5 w-3.5 text-brand" />
                    总下载
                  </div>
                  <p className="mt-1.5 text-base font-bold tabular-nums text-brand sm:text-lg">
                    {formatBytes(totalDownload)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    日均 {formatBytes(report.dailyAvgDownload || 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Upload className="h-3.5 w-3.5 text-info" />
                    总上传
                  </div>
                  <p className="mt-1.5 text-base font-bold tabular-nums text-info sm:text-lg">
                    {formatBytes(totalUpload)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    日均 {formatBytes(report.dailyAvgUpload || 0)}
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    日均流量
                  </div>
                  <p className="mt-1.5 text-base font-bold tabular-nums text-foreground sm:text-lg">
                    {loadingDetail && report.dailyAvgDownload === undefined ? '…' : formatBytes(dailyAvgTotal)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">按活跃天平均</p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card p-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Flame className="h-3.5 w-3.5 text-warning" />
                    峰值日
                  </div>
                  <p className="mt-1.5 truncate text-base font-bold tabular-nums text-foreground sm:text-lg">
                    {peakInfo ? peakInfo.mmdd : '—'}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {report.peakDayTraffic ? `${peakInfo?.weekday ? `${peakInfo.weekday} · ` : ''}${formatBytes(report.peakDayTraffic)}` : '暂无峰值数据'}
                  </p>
                </div>
              </div>

              {/* Daily traffic spark bars + clean rows */}
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BarChart3 className="h-4 w-4 text-brand" />
                    逐日流量分布
                  </h3>
                  {activeDays.length > 0 ? (
                    <span className="text-xs text-muted-foreground">共 {activeDays.length} 天记录</span>
                  ) : null}
                </div>

                {loadingDetail && breakdown.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">正在加载逐日流量明细…</p>
                ) : detailError ? (
                  <p className="py-6 text-center text-xs text-destructive">{detailError}</p>
                ) : activeDays.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    该周期未保留逐日原始采样，已展示历史汇总与设备排名。
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Compact bar profile across the whole period */}
                    <div className="rounded-xl bg-muted/30 px-3 pt-3 pb-2">
                      <div className="flex h-20 items-end gap-1">
                        {breakdown.map((day) => {
                          const heightPct = maxDailyTotal > 0 && day.total > 0
                            ? Math.max(10, Math.round((day.total / maxDailyTotal) * 100))
                            : 4;
                          const isPeak = report.peakDay === day.date && day.total > 0;
                          return (
                            <div
                              key={day.date}
                              title={`${day.date}: 总 ${formatBytes(day.total)}（下 ${formatBytes(day.download)} / 上 ${formatBytes(day.upload)}）`}
                              className="flex h-full flex-1 flex-col justify-end"
                            >
                              <div
                                className={cn(
                                  'w-full rounded-t-sm transition-all',
                                  day.total === 0
                                    ? 'bg-muted'
                                    : isPeak
                                      ? 'bg-warning'
                                      : 'bg-brand/75 hover:bg-brand',
                                )}
                                style={{ height: `${heightPct}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{breakdown[0]?.date.slice(5)}</span>
                        <span className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                          橙色柱为峰值日
                        </span>
                        <span>{breakdown[breakdown.length - 1]?.date.slice(5)}</span>
                      </div>
                    </div>

                    {/* Clean aligned daily rows */}
                    <div className="divide-y divide-border/50">
                      {visibleRows.map((day) => {
                        const { mmdd, weekday } = formatDayShort(day.date);
                        const isPeak = report.peakDay === day.date;
                        const rowPct = maxDailyTotal > 0 ? Math.round((day.total / maxDailyTotal) * 100) : 0;
                        return (
                          <div key={day.date} className="flex items-center justify-between gap-3 py-2 text-xs">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium tabular-nums text-foreground">{mmdd}</span>
                                <span className="text-muted-foreground">{weekday}</span>
                                {isPeak ? (
                                  <Badge variant="warning" className="h-4 rounded-full px-1.5 text-[10px]">
                                    峰值
                                  </Badge>
                                ) : null}
                                {day.avgSignal !== null ? (
                                  <span className="hidden text-[11px] tabular-nums text-muted-foreground sm:inline">
                                    · {day.avgSignal} dBm
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
                                <span>↓ {formatBytes(day.download)}</span>
                                <span>↑ {formatBytes(day.upload)}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2.5">
                              <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                                <div
                                  className={cn('h-full rounded-full', isPeak ? 'bg-warning' : 'bg-brand')}
                                  style={{ width: `${rowPct}%` }}
                                />
                              </div>
                              <span className="w-16 text-right font-semibold tabular-nums text-foreground">
                                {formatBytes(day.total)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {activeDays.length > 7 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setShowAllDays((prev) => !prev)}
                      >
                        {showAllDays ? (
                          <>
                            <ChevronUp className="mr-1 h-3.5 w-3.5" />
                            收起每日明细
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-1 h-3.5 w-3.5" />
                            展开全部 {activeDays.length} 天明细
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Device Ranking */}
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Activity className="h-4 w-4 text-brand" />
                  设备使用排名 TOP 10
                </h3>
                <DeviceRankingList devices={report.topDevices || []} />
              </div>
            </>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border/60 bg-card px-5 py-3.5 sm:flex sm:justify-end sm:px-6">
          <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)} variant="outline">
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
