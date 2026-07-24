'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

export interface AlertLogEntry {
  id: number;
  ruleId: number | null;
  triggeredAt: string | null;
  message: string | null;
  notified: boolean | null;
  ruleName: string | null;
}

interface AlertLogsResponse {
  logs: AlertLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export function useAlertHistory() {
  const [logs, setLogs] = useState<AlertLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifiedFilter, setNotifiedFilter] = useState<string>('all'); // 'all' | '0' | '1'
  const pageSize = 30;

  const fetchLogs = useCallback(async (currentPage: number, notified: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) });
      if (notified !== 'all') params.set('notified', notified);
      const data = await apiFetch<AlertLogsResponse>(
        `/api/alerts/logs?${params.toString()}`,
        undefined,
        '获取告警历史失败',
      );
      setLogs(data.logs);
      setTotal(data.total);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '获取告警历史失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs(page, notifiedFilter);
  }, [page, notifiedFilter, fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    logs,
    total,
    page,
    totalPages,
    pageSize,
    loading,
    error,
    notifiedFilter,
    setNotifiedFilter,
    setPage,
    refresh: () => { void fetchLogs(page, notifiedFilter); },
  };
}
