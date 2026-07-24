'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { LoadingBlock } from '@/components/LoadingBlock';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/client-api';
import { cn } from '@/lib/utils';

interface SystemLogEntry {
  id: number;
  level: string;
  message: string;
  createdAt: string;
}

interface SystemLogsResponse {
  logs: SystemLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const LEVEL_STYLES: Record<string, string> = {
  info: 'bg-info/10 text-info',
  warn: 'bg-warning/10 text-warning',
  error: 'bg-danger/10 text-danger',
};

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState('all');
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  const fetchLogs = useCallback(async (currentPage: number, currentLevel: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) });
      if (currentLevel !== 'all') params.set('level', currentLevel);
      const data = await apiFetch<SystemLogsResponse>(
        `/api/system/logs?${params.toString()}`,
        undefined,
        '获取系统日志失败',
      );
      setLogs(data.logs);
      setTotal(data.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs(page, level);
  }, [page, level, fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell>
      <PageHeader
        eyebrow="System / observability"
        title="系统日志"
        description="后台服务运行记录，包括采集、告警、同步等关键事件。"
        icon={<ScrollText className="h-6 w-6" />}
      />

      {/* Level filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-muted/50 p-1 text-xs ring-1 ring-border/60">
          {([
            ['all', '全部'],
            ['info', '信息'],
            ['warn', '警告'],
            ['error', '错误'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { setLevel(value); setPage(1); }}
              className={cn(
                'rounded-full px-3 py-1.5 font-medium transition',
                level === value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">共 {total} 条</span>
      </div>

      {/* Log list */}
      {loading ? (
        <LoadingBlock variant="table" />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-5 w-5" />}
          title="暂无日志"
          description="系统运行后，关键事件会记录在这里。"
        />
      ) : (
        <div className="space-y-1.5">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/15 px-4 py-3"
            >
              <Badge
                variant="secondary"
                className={cn('mt-0.5 shrink-0 text-[10px] uppercase', LEVEL_STYLES[log.level])}
              >
                {log.level}
              </Badge>
              <p className="min-w-0 flex-1 text-sm leading-5 text-foreground/90">{log.message}</p>
              <time className="shrink-0 text-xs text-muted-foreground">
                {log.createdAt
                  ? new Date(log.createdAt.replace(' ', 'T')).toLocaleString('zh-CN', {
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    })
                  : ''}
              </time>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </PageShell>
  );
}
