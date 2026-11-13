'use client';

import { useMemo } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Gauge, TrendingUp } from 'lucide-react';
import DonutChart from '@/components/charts/DonutChart';
import { computeDataPlanForecast } from '@/lib/data-plan-forecast';
import { formatBytes, formatWithUnit } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DataPlanConfig, TrafficStatsResponse } from '@/types';

const ONE_GIB = 1073741824;

function formatTrafficValue(bytes: number): string {
  return bytes >= ONE_GIB ? formatWithUnit(bytes, 'GB') : formatBytes(bytes);
}

interface DataPlanCardProps {
  startDate: DataPlanConfig;
  trafficStats: TrafficStatsResponse;
}

function formatShortMonthDay(dateKey: string): string {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  return `${Number(parts[1])}月${Number(parts[2])}日`;
}

export default function DataPlanCard({ startDate, trafficStats }: DataPlanCardProps) {
  const limitBytes = parseInt(String(startDate.trafficmaxlimit || '0'), 10);
  // The quota resets monthly; Current* is only the current WAN session.
  // The router's month_statistics endpoint provides the actual package cycle.
  const monthDownload = parseInt(String(trafficStats.CurrentMonthDownload || '0'), 10);
  const monthUpload = parseInt(String(trafficStats.CurrentMonthUpload || '0'), 10);
  const usedBytes = monthDownload + monthUpload > 0
    ? monthDownload + monthUpload
    : parseInt(String(trafficStats.CurrentDownload || '0'), 10)
      + parseInt(String(trafficStats.CurrentUpload || '0'), 10);

  const dayThreshold = parseInt(String(startDate.DayThreshold || '90'), 10);
  const monthThreshold = parseInt(String(startDate.MonthThreshold || '90'), 10);
  const resetDay = parseInt(String(startDate.StartDay || '1'), 10);

  const forecast = useMemo(() => computeDataPlanForecast({
    usedBytes,
    limitBytes,
    resetDay,
    warningThresholdPercent: monthThreshold,
  }), [usedBytes, limitBytes, resetDay, monthThreshold]);

  const percent = forecast.hasLimit ? Math.min(forecast.usedPercent, 100) : 0;
  const remaining = Math.max(limitBytes - usedBytes, 0);
  const isWarning = forecast.hasLimit && forecast.usedPercent >= monthThreshold;
  const isOver = forecast.hasLimit && forecast.usedPercent >= 100;

  const donutColor = isOver
    ? 'var(--danger)'
    : isWarning
      ? 'var(--warning)'
      : undefined; // undefined lets DonutChart use the brand palette

  const segments = useMemo(() => [
    { label: '已用', value: Math.min(usedBytes, limitBytes || usedBytes || 1), color: donutColor },
    { label: '剩余', value: limitBytes > 0 ? remaining : 0 },
  ], [usedBytes, limitBytes, remaining, donutColor]);

  const projectedColorClass = forecast.status === 'over' || forecast.status === 'will_exceed'
    ? 'text-danger'
    : forecast.status === 'warning'
      ? 'text-warning'
      : 'text-brand';

  const forecastBanner = (() => {
    if (!forecast.hasLimit) {
      return {
        tone: 'border-border/60 bg-muted/35 text-muted-foreground',
        icon: <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-brand" />,
        text: `本周期已用 ${forecast.elapsedCalendarDays}/${forecast.totalCycleDays} 天，按当前日均估算周期总用量约 ${formatWithUnit(forecast.projectedTotalBytes, 'GB')}。`,
      };
    }

    if (forecast.status === 'over') {
      return {
        tone: 'border-danger/30 bg-danger/10 text-danger',
        icon: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />,
        text: `已超出套餐 ${formatWithUnit(usedBytes - limitBytes, 'GB')}，距离 ${formatShortMonthDay(forecast.nextResetDate)} 重置还有 ${forecast.remainingCalendarDays} 天。`,
      };
    }

    if (forecast.status === 'will_exceed') {
      const exhaustHint = forecast.estimatedExhaustDate && forecast.estimatedExhaustDays !== null
        ? `约 ${forecast.estimatedExhaustDays.toFixed(1)} 天后（${formatShortMonthDay(forecast.estimatedExhaustDate)}）耗尽，`
        : '';
      return {
        tone: 'border-warning/35 bg-warning/10 text-foreground',
        icon: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />,
        text: `按当前速率${exhaustHint}预计总用将超 ${formatWithUnit(forecast.projectedOverBytes, 'GB')}，建议后续日均 ≤ ${formatWithUnit(forecast.dailyBudgetBytes, 'GB')}。`,
      };
    }

    if (forecast.status === 'warning') {
      return {
        tone: 'border-warning/30 bg-warning/10 text-foreground',
        icon: <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-warning" />,
        text: `预计本周期总用 ${formatWithUnit(forecast.projectedTotalBytes, 'GB')}（${forecast.projectedPercent.toFixed(0)}%），接近 ${monthThreshold}% 月阈值，建议日均 ≤ ${formatWithUnit(forecast.dailyBudgetBytes, 'GB')}。`,
      };
    }

    return {
      tone: 'border-success/25 bg-success/10 text-foreground',
      icon: <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />,
      text: `预计本周期总用 ${formatWithUnit(forecast.projectedTotalBytes, 'GB')}（${forecast.projectedPercent.toFixed(0)}%），余量充足，日均预算 ${formatWithUnit(forecast.dailyBudgetBytes, 'GB')}。`,
    };
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-[6.75rem] shrink-0 sm:w-[8.25rem]">
          <DonutChart
            segments={segments}
            centerLabel={forecast.hasLimit ? `${percent.toFixed(1)}%` : formatWithUnit(usedBytes, 'GB')}
            centerSub={forecast.hasLimit ? '使用率' : '本周期已用'}
            height={132}
            showLegend={false}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">已用 / 总量</p>
          <p className="break-words text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl">
            <span className={isOver ? 'text-danger' : isWarning ? 'text-warning' : 'text-brand'}>
              {formatWithUnit(usedBytes, 'GB')}
            </span>
            <span className="text-sm font-normal text-muted-foreground sm:text-base">
              {' '}/ {forecast.hasLimit ? formatWithUnit(limitBytes, 'GB') : '未设置'}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span>{forecast.hasLimit ? `剩余 ${formatWithUnit(remaining, 'GB')}` : '无套餐上限'}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" />
              距重置 {forecast.remainingCalendarDays} 天
            </span>
          </div>
        </div>
      </div>

      {/* Usage progress vs time elapsed reference */}
      <div className="space-y-1.5">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isOver ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-brand',
            )}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
          {forecast.hasLimit && forecast.timeProgressPercent > 0 && forecast.timeProgressPercent < 100 ? (
            <div
              title={`周期时间进度 ${forecast.timeProgressPercent.toFixed(1)}%`}
              className="absolute inset-y-0 w-0.5 bg-foreground/70"
              style={{ left: `${forecast.timeProgressPercent}%` }}
            />
          ) : null}
        </div>
        <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
          <span>周期第 {forecast.elapsedCalendarDays}/{forecast.totalCycleDays} 天</span>
          <span>时间进度 {forecast.timeProgressPercent.toFixed(1)}%</span>
        </div>
      </div>

      {/* Clean 2x2 forecast & threshold grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">当前日均</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
            {formatTrafficValue(forecast.dailyAvgBytes)}
            <span className="text-xs font-normal text-muted-foreground">/天</span>
          </p>
        </div>

        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">剩余可用预算</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
            {forecast.hasLimit ? (
              <>
                {formatTrafficValue(forecast.dailyBudgetBytes)}
                <span className="text-xs font-normal text-muted-foreground">/天</span>
              </>
            ) : '—'}
          </p>
        </div>

        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">预计周期总用</p>
          <p className={cn('mt-1 text-sm font-bold tabular-nums', projectedColorClass)}>
            {formatTrafficValue(forecast.projectedTotalBytes)}
            {forecast.hasLimit ? (
              <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                ({forecast.projectedPercent.toFixed(0)}%)
              </span>
            ) : null}
          </p>
        </div>

        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">阈值设置</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-foreground">
            日 {dayThreshold}% · 月 {monthThreshold}%
          </p>
        </div>
      </div>

      {/* Forecast advisory callout */}
      <div className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed', forecastBanner.tone)}>
        {forecastBanner.icon}
        <p className="min-w-0 flex-1">{forecastBanner.text}</p>
      </div>
    </div>
  );
}
