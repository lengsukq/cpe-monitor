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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">已用 / 总量</p>
          <p className="text-2xl font-bold">
            <span className={isOver ? 'text-danger' : isWarning ? 'text-warning' : 'text-brand'}>
              {formatWithUnit(usedBytes, 'GB')}
            </span>
            <span className="text-base font-normal text-muted-foreground"> / {formatWithUnit(limitBytes, 'GB')}</span>
          </p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isOver ? 'text-danger' : isWarning ? 'text-warning' : 'text-brand'}`}>
            {percent.toFixed(1)}%
          </p>
          <p className="text-sm text-muted-foreground">剩余 {formatWithUnit(remaining, 'GB')}</p>
        </div>
      </div>
      <div className="h-3 w-full rounded-full bg-muted">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${isOver ? 'bg-danger' : isWarning ? 'bg-warning' : 'bg-brand'}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm">
        <div>
          <p className="text-muted-foreground">日阈值</p>
          <p className="font-medium">{startDate.DayThreshold || 90}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">月阈值</p>
          <p className="font-medium">{startDate.MonthThreshold || 90}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">套餐</p>
          <p className="font-medium">{startDate.DataLimit || '-'}</p>
        </div>
      </div>
    </div>
  );
}
