'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/client-api';
import type { DailyReport } from '@/types';
import {
  filterDailyReports,
  getPreviewDevices,
  getReportOverviewStats,
  getReportQualityOptions,
  type DailyReportPreview,
} from '../model';

export function useDailyReports() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [previewReport, setPreviewReport] = useState<DailyReportPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [qualityFilter, setQualityFilter] = useState('all');

  const fetchReports = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchReports(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchReports]);

  const generatePreview = useCallback(async () => {
    setError('');
    try {
      const data = await apiFetch<DailyReportPreview>(
        '/api/reports/daily',
        { method: 'POST' },
        '生成报告失败',
      );
      setPreviewReport(data);
      setIsDialogOpen(true);

      if (data.notifications?.emailSent) {
        toast.success('日报已保存并通过邮件发送', { duration: 4000 });
      } else if (data.notifications?.wechatSent) {
        toast.success('日报已保存并通过企微发送', { duration: 4000 });
      } else {
        toast.success('日报已保存至数据库', { duration: 3000 });
      }

      await fetchReports();
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : '生成报告失败');
    }
  }, [fetchReports]);

  const openReport = useCallback((report: DailyReport) => {
    setPreviewReport(report);
    setIsDialogOpen(true);
  }, []);

  const visibleReports = useMemo(
    () => filterDailyReports(reports, query, qualityFilter),
    [qualityFilter, query, reports],
  );
  const qualityOptions = useMemo(() => getReportQualityOptions(reports), [reports]);
  const overview = useMemo(() => getReportOverviewStats(reports), [reports]);
  const topDevices = useMemo(() => getPreviewDevices(previewReport), [previewReport]);

  return {
    reports,
    visibleReports,
    previewReport,
    topDevices,
    qualityOptions,
    overview,
    loading,
    isDialogOpen,
    error,
    query,
    qualityFilter,
    setIsDialogOpen,
    setQuery,
    setQualityFilter,
    generatePreview,
    openReport,
  };
}
