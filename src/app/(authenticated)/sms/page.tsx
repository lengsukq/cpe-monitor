'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Mail, MessageSquareText, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Smartphone, X } from 'lucide-react';
import { Callout } from '@/components/Callout';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/client-api';
import { formatSyncTime } from '@/lib/format';

interface SmsMessage {
  id: string;
  phone: string;
  content: string;
  date: string;
  unread: boolean;
  direction: 'inbound' | 'outbound';
}

interface SmsSyncStatus {
  enabled: boolean;
  interval: number;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

type Filter = 'all' | 'unread' | 'read';
type DirectionFilter = 'all' | 'inbound' | 'outbound';

export default function SmsPage() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [sync, setSync] = useState<SmsSyncStatus | null>(null);

  async function loadMessages() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<{
        messages?: SmsMessage[];
        total?: number;
        unread?: number;
        sync?: SmsSyncStatus | null;
      }>('/api/dashboard/sms', undefined, '获取短信失败');
      setMessages(data.messages || []);
      setTotal(data.total || 0);
      setUnread(data.unread || 0);
      setSync(data.sync || null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '获取短信失败');
    } finally {
      setLoading(false);
    }
  }

  async function syncAndLoadMessages() {
    setSyncing(true);
    setError('');
    try {
      const data = await apiFetch<{ sync?: SmsSyncStatus | null }>(
        '/api/dashboard/sms/sync',
        { method: 'POST' },
        '同步短信失败',
      );
      setSync(data.sync || null);
      await loadMessages();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : '同步短信失败');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  function applyQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKeyword(keywordInput.trim());
  }

  function clearQuery() {
    setKeywordInput('');
    setKeyword('');
    setFilter('all');
    setDirection('all');
  }

  const hasActiveQuery = Boolean(keyword || filter !== 'all' || direction !== 'all');
  const visibleMessages = useMemo(
    () => {
      const normalizedKeyword = keyword.toLocaleLowerCase();
      return messages.filter((message) => {
        const matchesKeyword = !normalizedKeyword || [message.phone, message.content, message.date]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedKeyword);
        const matchesReadStatus = filter === 'all' || (filter === 'unread' ? message.unread : !message.unread);
        const matchesDirection = direction === 'all' || message.direction === direction;
        return matchesKeyword && matchesReadStatus && matchesDirection;
      });
    },
    [direction, filter, keyword, messages],
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / message channel"
        title="短信收件箱"
        description="短信会同步到本地数据库并保留完整内容。此页面只读，不会调用发送、删除或标记已读接口。"
        actions={
          <Button size="sm" variant="outline" onClick={() => { void syncAndLoadMessages(); }} disabled={loading || syncing}>
            <RefreshCw className={loading || syncing ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            {syncing ? '同步中…' : '同步并刷新'}
          </Button>
        }
      />

      <PageOverview
        eyebrow={<><MessageSquareText className="h-3.5 w-3.5" />CPE / message channel</>}
        title="短信概览"
        description="本地收件箱与自动同步状态，数据来自持久化副本。"
        items={[
          {
            label: '本地收件箱',
            value: `${total} 条`,
            detail: '已同步到本地数据库',
            icon: <MessageSquareText className="h-3.5 w-3.5" />,
          },
          {
            label: '未读',
            value: `${unread} 条`,
            detail: unread > 0 ? '有待查看短信' : '全部已读',
            icon: <Mail className="h-3.5 w-3.5" />,
          },
          {
            label: '同步策略',
            value: sync?.enabled ? `每 ${sync.interval} 分钟` : '已暂停',
            detail: sync?.running ? '后台运行中' : '等待下一次同步',
            icon: <ShieldCheck className="h-3.5 w-3.5" />,
          },
          {
            label: '最近同步',
            value: formatSyncTime(sync?.lastSyncedAt),
            detail: sync?.lastError ? '最近一次同步失败' : '状态正常',
            icon: <RefreshCw className="h-3.5 w-3.5" />,
          },
        ]}
      />

      <section className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm lg:p-7">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">最近短信</h2>
            <p className="mt-1 text-sm text-muted-foreground">数据来自本地持久化副本；可按号码、内容和状态查询</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            显示 {visibleMessages.length} / {total} 条
          </span>
        </div>

        <form onSubmit={applyQuery} className="mt-5 rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="sr-only" htmlFor="sms-search">搜索短信</label>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="sms-search"
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="搜索号码、短信内容或时间"
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
              <Search className="h-4 w-4" />
              查询
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              筛选
            </span>
            <div className="flex rounded-full bg-background p-1 text-xs shadow-sm ring-1 ring-border/60">
              {([
                ['all', '全部'],
                ['unread', `未读${unread > 0 ? ` (${unread})` : ''}`],
                ['read', '已读'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1.5 transition ${filter === value ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="sms-direction">短信方向</label>
            <select
              id="sms-direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value as DirectionFilter)}
              className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
            >
              <option value="all">全部方向</option>
              <option value="inbound">收到的</option>
              <option value="outbound">已发送</option>
            </select>

            {hasActiveQuery ? (
              <button type="button" onClick={clearQuery} className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground transition hover:bg-background hover:text-foreground">
                <X className="h-3.5 w-3.5" />
                清除条件
              </button>
            ) : null}
          </div>
        </form>

        {error ? <div className="mt-4"><Callout tone="danger">{error}</Callout></div> : null}
        {!error && sync?.lastError ? <div className="mt-4"><Callout tone="warning">上次自动同步失败：{sync.lastError}</Callout></div> : null}
        {loading ? (
          <div className="mt-5"><LoadingBlock variant="table" /></div>
        ) : visibleMessages.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon={<MessageSquareText className="h-5 w-5" />}
              title={messages.length === 0 ? '暂无短信' : hasActiveQuery ? '没有符合条件的短信' : '没有短信'}
              description={messages.length === 0 ? '点击「同步并刷新」从 CPE 拉取短信。' : '尝试调整筛选条件。'}
            />
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border">
            {visibleMessages.map((message, index) => (
              <article key={`${message.id}-${index}`} className="group grid gap-4 py-5 md:grid-cols-[minmax(150px,0.3fr)_minmax(0,1fr)_150px] md:items-start">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${message.unread ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {message.direction === 'inbound' ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{message.phone}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{message.direction === 'inbound' ? '收到' : '已发送'}</p>
                  </div>
                </div>
                <p className={`whitespace-pre-wrap text-sm leading-6 ${message.unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{message.content || '（无内容）'}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground md:justify-end">
                  {message.unread ? <Badge variant="info">未读</Badge> : <Badge variant="secondary">已读</Badge>}
                  <span>{message.date || '未知时间'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}

