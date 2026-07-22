'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import ResponsiveDataView from '@/components/ResponsiveDataView';
import {
  OverviewBars,
  OverviewDonut,
  OverviewSegments,
} from '@/components/overview/OverviewMiniCharts';
import { Callout } from '@/components/Callout';
import DataTableCard from '@/components/DataTableCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Bell, CheckCircle2, Clock3, Search, SlidersHorizontal, XCircle } from 'lucide-react';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/client-api';
import { formatDateTimeShanghai } from '@/lib/format';
import type { AlertLogWithRuleName } from '@/types';

function getRecentDailyCounts(logs: AlertLogWithRuleName[], dayCount = 7) {
  const now = Date.now();
  const counts = Array.from({ length: dayCount }, () => 0);

  for (const log of logs) {
    const timestamp = new Date(log.triggeredAt || '').getTime();
    if (!Number.isFinite(timestamp)) continue;
    const diffDays = Math.floor((now - timestamp) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays < dayCount) {
      counts[dayCount - 1 - diffDays] += 1;
    }
  }

  return counts;
}

export default function AlertLogsPage() {
  const [logs, setLogs] = useState<AlertLogWithRuleName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'notified' | 'pending'>('all');

  async function fetchLogs() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<AlertLogWithRuleName[]>('/api/alerts/logs', undefined, '获取告警日志失败');
      setLogs(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '获取告警日志失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchLogs(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const notifiedCount = logs.filter((log) => log.notified).length;
  const pendingCount = logs.length - notifiedCount;
  const recentDailyCounts = getRecentDailyCounts(logs);
  const ruleCounts = Object.entries(logs.reduce<Record<string, number>>((result, log) => {
    const name = log.ruleName || '未知规则';
    result[name] = (result[name] || 0) + 1;
    return result;
  }, {}))
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, value]) => ({ label, value }));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleLogs = logs.filter((log) => {
    const matchesQuery = !normalizedQuery || [
      log.ruleName,
      log.message,
      formatDateTimeShanghai(log.triggeredAt),
    ].join(' ').toLocaleLowerCase().includes(normalizedQuery);
    const matchesNotification = notificationFilter === 'all'
      || (notificationFilter === 'notified' ? Boolean(log.notified) : !log.notified);
    return matchesQuery && matchesNotification;
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / alert history"
        title="告警日志"
        description="查看历史触发记录与通知状态，便于排查规则是否按预期生效。"
        icon={<Clock3 className="h-6 w-6" />}
      />
      <PageOverview
        eyebrow={<><Bell className="h-3.5 w-3.5" />Alerts / history</>}
        title="触发概览"
        description="历史触发与通知送达情况，便于排查规则与渠道是否按预期工作。"
        items={[
          {
            label: '记录总数',
            value: loading ? '…' : String(logs.length),
            detail: '历史触发次数',
            icon: <Bell className="h-3.5 w-3.5" />,
            chart: <OverviewBars values={recentDailyCounts} label="最近七天告警次数" />,
          },
          {
            label: '已通知',
            value: loading ? '…' : String(notifiedCount),
            detail: '成功发出通知',
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={notifiedCount}
                total={Math.max(logs.length, 1)}
                label="告警通知成功占比"
                className="text-success"
              />
            ),
          },
          {
            label: '未通知',
            value: loading ? '…' : String(pendingCount),
            detail: '可能静默或渠道未配置',
            icon: <XCircle className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={pendingCount}
                total={Math.max(logs.length, 1)}
                label="未通知告警占比"
                className="text-warning"
              />
            ),
          },
          {
            label: '最近触发',
            value: loading ? '…' : (logs[0] ? formatDateTimeShanghai(logs[0].triggeredAt) : '—'),
            detail: logs[0]?.ruleName || '暂无记录',
            icon: <Clock3 className="h-3.5 w-3.5" />,
            chart: <OverviewSegments segments={ruleCounts} label="触发规则分布" />,
          },
        ]}
      />
      {error ? <Callout tone="danger">{error}</Callout> : null}

      <section className="app-panel grid gap-3 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center sm:p-4">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索规则名称、告警消息或时间"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <label className="relative min-w-0">
          <span className="sr-only">通知状态</span>
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={notificationFilter}
            onChange={(event) => setNotificationFilter(event.target.value as 'all' | 'notified' | 'pending')}
            className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
          >
            <option value="all">全部通知状态</option>
            <option value="notified">已通知</option>
            <option value="pending">未通知</option>
          </select>
        </label>
        <span className="shrink-0 text-center text-xs text-muted-foreground sm:text-left">
          显示 {visibleLogs.length} / {logs.length} 条
        </span>
      </section>

      <ResponsiveDataView
        loading={loading}
        isEmpty={visibleLogs.length === 0}
        emptyMessage={logs.length === 0 ? '暂无告警记录' : '没有符合条件的告警记录'}
        mobile={visibleLogs.map((log) => (
          <article
            key={log.id}
            className="rounded-[26px] border border-border/65 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {log.ruleName || '未知规则'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTimeShanghai(log.triggeredAt)}
                </p>
              </div>
              <Badge variant={log.notified ? 'success' : 'warning'}>
                {log.notified ? '已通知' : '未通知'}
              </Badge>
            </div>

            <div className="mt-4 rounded-2xl bg-muted/35 p-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                触发消息
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                {log.message || '没有附加消息'}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>记录 ID #{log.id}</span>
              <span>{log.ruleId ? `规则 ID #${log.ruleId}` : '系统事件'}</span>
            </div>
          </article>
        ))}
        desktop={(
          <DataTableCard
            colSpan={4}
            loading={loading}
            isEmpty={visibleLogs.length === 0}
            emptyMessage={logs.length === 0 ? '暂无告警记录' : '没有符合条件的告警记录'}
            columns={
              <>
                <TableHead>时间</TableHead>
                <TableHead>规则</TableHead>
                <TableHead>消息</TableHead>
                <TableHead>通知状态</TableHead>
              </>
            }
          >
            {visibleLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{formatDateTimeShanghai(log.triggeredAt)}</TableCell>
                <TableCell>{log.ruleName || '-'}</TableCell>
                <TableCell className="max-w-[12rem] whitespace-normal break-words sm:max-w-md">{log.message || '-'}</TableCell>
                <TableCell>
                  <Badge variant={log.notified ? 'success' : 'secondary'}>
                    {log.notified ? '已通知' : '未通知'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </DataTableCard>
        )}
      />
    </PageShell>
  );
}
