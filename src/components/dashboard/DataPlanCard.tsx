'use client';

import { useMemo } from 'react';
import DonutChart from '@/components/charts/DonutChart';
import { formatWithUnit } from '@/lib/format';
import type { DataPlanConfig, TrafficStatsResponse } from '@/types';

interface DataPlanCardProps {
  startDate: DataPlanConfig;
  trafficStats: TrafficStatsResponse;
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
  const percent = limitBytes > 0 ? Math.min((usedBytes / limitBytes) * 100, 100) : 0;
  const remaining = Math.max(limitBytes - usedBytes, 0);
  const threshold = parseInt(String(startDate.MonthThreshold || '90'), 10);
  const isWarning = percent >= threshold;
  const isOver = percent >= 100;

  const donutColor = isOver
    ? 'var(--danger)'
    : isWarning
      ? 'var(--warning)'
      : undefined; // undefined lets DonutChart use the brand palette

  const segments = useMemo(() => [
    { label: '已用', value: Math.min(usedBytes, limitBytes || usedBytes || 1), color: donutColor },
    { label: '剩余', value: limitBytes > 0 ? remaining : 0 },
  ], [usedBytes, limitBytes, remaining, donutColor]);

  return (
    <div className="fluid-card-grid min-h-[300px] items-center gap-6 [--fluid-card-min:15rem]">
      <div className="flex justify-center">
        <div className="w-[clamp(11rem,26vw,13rem)]">
          <DonutChart
            segments={segments}
            centerLabel={`${percent.toFixed(1)}%`}
            centerSub="使用率"
            height={210}
            showLegend={false}
          />
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">已用 / 总量</p>
          <p className="mt-2 break-words text-2xl font-extrabold tracking-tight">
            <span className={isOver ? 'text-danger' : isWarning ? 'text-warning' : 'text-brand'}>
              {formatWithUnit(usedBytes, 'GB')}
            </span>
            <span className="text-base font-normal text-muted-foreground"> / {formatWithUnit(limitBytes, 'GB')}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">剩余 {formatWithUnit(remaining, 'GB')}</p>
        </div>

        <div className="fluid-card-grid gap-2 [--fluid-card-min:7.5rem]">
          <div className="rounded-2xl bg-muted/45 p-3">
            <p className="text-xs text-muted-foreground">日阈值</p>
            <p className="mt-1 font-bold">{startDate.DayThreshold || 90}%</p>
          </div>
          <div className="rounded-2xl bg-muted/45 p-3">
            <p className="text-xs text-muted-foreground">月阈值</p>
            <p className="mt-1 font-bold">{startDate.MonthThreshold || 90}%</p>
          </div>
          <div className="rounded-2xl bg-muted/45 p-3">
            <p className="text-xs text-muted-foreground">套餐</p>
            <p className="mt-1 truncate font-bold" title={String(startDate.DataLimit || '-')}>
              {startDate.DataLimit || '-'}
            </p>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-brand'}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
