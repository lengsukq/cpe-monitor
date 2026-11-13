'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, CalendarRange, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Callout } from '@/components/Callout';
import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/client-api';
import { formatAppDateTime } from '@/lib/date-time';
import { formatBytes } from '@/lib/format';
import { getReportQualityVariant } from '../model';
import { PeriodReportDialog, type PeriodReportItem } from './PeriodReportDialog';

interface PeriodReportsViewProps {
  type: 'weekly' | 'monthly';
}

export function PeriodReportsView({ type }: PeriodReportsViewProps) {
  const [reports, setReports] = useState<PeriodReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingScope, setGeneratingScope] = useState<'current' | 'previous' | null>(null);

  const [selectedReport, setSelectedReport] = useState<PeriodReportItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{ reports: PeriodReportItem[] }>(
        `/api/reports/period?type=${type}`,
        undefined,
        '获取周期报告失败',
      );
      setReports(Array.isArray(data.reports) ? data.reports : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '获取周期报告失败');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchReports();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchReports]);

  const openReport = useCallback(async (report: PeriodReportItem) => {
    setSelectedReport(report);
    setDetailError('');
    setDialogOpen(true);
    setLoadingDetail(true);
    try {
      const data = await apiFetch<{ report: PeriodReportItem }>(
        `/api/reports/period?id=${report.id}`,
        undefined,
        '获取周期报告详情失败',
      );
      if (data.report) {
        setSelectedReport(data.report);
      }
    } catch (fetchError) {
      setDetailError(fetchError instanceof Error ? fetchError.message : '获取周期报告详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const generateReport = useCallback(async (scope: 'current' | 'previous') => {
    setGeneratingScope(scope);
    setError('');
    try {
      const data = await apiFetch<{ report: PeriodReportItem }>(
        '/api/reports/period',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, scope }),
        },
        '生成周期报告失败',
      );
      const label = type === 'weekly'
        ? (scope === 'current' ? '本周周报' : '上周周报')
        : (scope === 'current' ? '本月月报' : '上月月报');
      toast.success(`${label}已生成并保存`);
      if (data.report) {
        setSelectedReport(data.report);
        setDetailError('');
        setLoadingDetail(false);
        setDialogOpen(true);
      }
      await fetchReports();
    } catch (genError) {
      const message = genError instanceof Error ? genError.message : '生成周期报告失败';
      setError(message);
      toast.error(message);
    } finally {
      setGeneratingScope(null);
    }
  }, [fetchReports, type]);

  const Icon = type === 'weekly' ? CalendarDays : CalendarRange;
  const currentButtonLabel = type === 'weekly' ? '生成本周周报' : '生成本月月报';
  const previousButtonLabel = type === 'weekly' ? '更新上周周报' : '更新上月月报';

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {type === 'weekly'
          ? '点击任意周报卡片或「详情」查看逐日流量与设备排行，每周日 22:30 自动生成上周报告。'
          : '点击任意月报卡片或「详情」查看逐日流量与设备排行，每月 1 号 00:30 自动生成上月报告。'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={generatingScope !== null}
          onClick={() => { void generateReport('previous'); }}
        >
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${generatingScope === 'previous' ? 'animate-spin' : ''}`} />
          {generatingScope === 'previous' ? '生成中…' : previousButtonLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={generatingScope !== null}
          onClick={() => { void generateReport('current'); }}
        >
          {generatingScope === 'current' ? '生成中…' : currentButtonLabel}
        </Button>
      </div>
    </div>
  );

  if (loading) return <LoadingBlock variant="table" />;

  return (
    <div className="space-y-4">
      {toolbar}

      {error ? <Callout tone="danger">{error}</Callout> : null}

      {reports.length === 0 ? (
        <EmptyState
          icon={<Icon className="h-5 w-5" />}
          title={type === 'weekly' ? '暂无周报' : '暂无月报'}
          description={type === 'weekly' ? '每周日 22:30 自动生成上周报告，也可立即手动生成。' : '每月 1 号 00:30 自动生成上月报告，也可立即手动生成。'}
          action={(
            <Button type="button" size="sm" onClick={() => { void generateReport('current'); }}>
              {currentButtonLabel}
            </Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const totalTraffic = (report.totalDownload || 0) + (report.totalUpload || 0);
            return (
              <Card
                key={report.id}
                role="button"
                tabIndex={0}
                onClick={() => { void openReport(report); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void openReport(report);
                  }
                }}
                className="card-hover cursor-pointer transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="flex flex-wrap items-center gap-4 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{report.periodKey}</p>
                      {report.startDate && report.endDate ? (
                        <span className="text-xs text-muted-foreground">
                          {report.startDate} ~ {report.endDate}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      总流量 {formatBytes(totalTraffic)} · 生成于{' '}
                      {formatAppDateTime(report.createdAt, {
                        hour: undefined,
                        minute: undefined,
                        second: undefined,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">下载</p>
                      <p className="font-medium tabular-nums">{formatBytes(report.totalDownload || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">上传</p>
                      <p className="font-medium tabular-nums">{formatBytes(report.totalUpload || 0)}</p>
                    </div>
                    {report.avgSignal !== null && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">信号</p>
                        <p className="font-medium tabular-nums">{report.avgSignal} dBm</p>
                      </div>
                    )}
                    <Badge variant={getReportQualityVariant(report.networkQuality)}>
                      {report.networkQuality || '-'}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        void openReport(report);
                      }}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      详情
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PeriodReportDialog
        open={dialogOpen}
        report={selectedReport}
        loadingDetail={loadingDetail}
        detailError={detailError}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
