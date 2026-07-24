'use client';

import { BellOff, BellRing, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { useAlertHistory } from '../hooks/useAlertHistory';

export function AlertHistoryView() {
  const history = useAlertHistory();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">通知状态</span>
        <div className="flex rounded-full bg-muted/50 p-1 text-xs ring-1 ring-border/60">
          {([
            ['all', '全部'],
            ['1', '已通知'],
            ['0', '未通知'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => { history.setNotifiedFilter(value); history.setPage(1); }}
              className={`rounded-full px-3 py-1.5 font-medium transition ${
                history.notifiedFilter === value
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          共 {history.total} 条记录
        </span>
      </div>

      {/* Content */}
      {history.loading ? (
        <LoadingBlock variant="table" />
      ) : history.error ? (
        <p className="py-8 text-center text-sm text-danger">{history.error}</p>
      ) : history.logs.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-5 w-5" />}
          title="暂无告警记录"
          description="当告警规则触发时，记录会显示在这里。"
        />
      ) : (
        <div className="space-y-2">
          {history.logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-2 rounded-2xl border border-border/65 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                    <BellRing className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-sm font-medium">
                    {log.ruleName || '未知规则'}
                  </span>
                  {log.notified ? (
                    <Badge variant="success" className="shrink-0">已通知</Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">未通知</Badge>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {log.message || '无详细信息'}
                </p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground sm:text-right">
                {log.triggeredAt
                  ? new Date(log.triggeredAt).toLocaleString('zh-CN')
                  : '未知时间'}
              </time>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {history.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={history.page <= 1}
            onClick={() => history.setPage(history.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {history.page} / {history.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={history.page >= history.totalPages}
            onClick={() => history.setPage(history.page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
