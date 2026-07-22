'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import { Callout } from '@/components/Callout';
import DataTableCard from '@/components/DataTableCard';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/client-api';
import { formatDateTimeShanghai } from '@/lib/format';
import type { AlertLogWithRuleName } from '@/types';

export default function AlertLogsPage() {
  const [logs, setLogs] = useState<AlertLogWithRuleName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          },
          {
            label: '已通知',
            value: loading ? '…' : String(logs.filter((log) => log.notified).length),
            detail: '成功发出通知',
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          },
          {
            label: '未通知',
            value: loading ? '…' : String(logs.filter((log) => !log.notified).length),
            detail: '可能静默或渠道未配置',
            icon: <XCircle className="h-3.5 w-3.5" />,
          },
          {
            label: '最近触发',
            value: loading ? '…' : (logs[0] ? formatDateTimeShanghai(logs[0].triggeredAt) : '—'),
            detail: logs[0]?.ruleName || '暂无记录',
            icon: <Clock3 className="h-3.5 w-3.5" />,
          },
        ]}
      />
      {error ? <Callout tone="danger">{error}</Callout> : null}
      <DataTableCard
        colSpan={4}
        loading={loading}
        isEmpty={logs.length === 0}
        emptyMessage="暂无告警记录"
        columns={
          <>
            <TableHead>时间</TableHead>
            <TableHead>规则</TableHead>
            <TableHead>消息</TableHead>
            <TableHead>通知状态</TableHead>
          </>
        }
      >
        {logs.map((log) => (
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
    </PageShell>
  );
}
