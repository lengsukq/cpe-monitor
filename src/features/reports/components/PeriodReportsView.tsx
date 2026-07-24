'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CalendarRange } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { apiFetch } from '@/lib/client-api';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PeriodReportItem {
  id: number;
  periodKey: string;
  periodType: string;
  totalUpload: number | null;
  totalDownload: number | null;
  avgSignal: number | null;
  networkQuality: string | null;
  createdAt: string | null;
}

interface PeriodReportsViewProps {
  type: 'weekly' | 'monthly';
}

export function PeriodReportsView({ type }: PeriodReportsViewProps) {
  const [reports, setReports] = useState<PeriodReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ reports: PeriodReportItem[] }>(
        `/api/reports/period?type=${type}`,
        undefined,
        '获取周期报告失败',
      );
      setReports(data.reports);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const Icon = type === 'weekly' ? CalendarDays : CalendarRange;

  if (loading) return <LoadingBlock variant="table" />;

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={<Icon className="h-5 w-5" />}
        title={type === 'weekly' ? '暂无周报' : '暂无月报'}
        description={type === 'weekly' ? '每周日 22:30 自动生成上周报告。' : '每月 1 号 00:30 自动生成上月报告。'}
      />
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <Card key={report.id} className="card-hover">
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
              <Icon className="h-5 w-5 text-brand" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{report.periodKey}</p>
              <p className="text-xs text-muted-foreground">
                生成于 {report.createdAt ? new Date(report.createdAt.replace(' ', 'T')).toLocaleDateString('zh-CN') : '-'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">下载</p>
                <p className="font-medium">{formatBytes(report.totalDownload || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">上传</p>
                <p className="font-medium">{formatBytes(report.totalUpload || 0)}</p>
              </div>
              {report.avgSignal !== null && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">信号</p>
                  <p className="font-medium">{report.avgSignal}</p>
                </div>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  report.networkQuality === '优秀' && 'bg-success/10 text-success',
                  report.networkQuality === '良好' && 'bg-info/10 text-info',
                  report.networkQuality === '一般' && 'bg-warning/10 text-warning',
                  report.networkQuality === '差' && 'bg-danger/10 text-danger',
                )}
              >
                {report.networkQuality || '-'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
