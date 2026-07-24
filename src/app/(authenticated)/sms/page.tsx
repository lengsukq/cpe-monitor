'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BarChart3, Mail, MessageSquareText, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Smartphone, X } from 'lucide-react';
import { Callout } from '@/components/Callout';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import {
  OverviewBars,
  OverviewDonut,
  OverviewSegments,
} from '@/components/overview/OverviewMiniCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemedBarChart } from '@/components/charts/BarChart';
import { ScrollReveal } from '@/components/motion';
import { EmptyState } from '@/components/EmptyState';
import { LoadingBlock } from '@/components/LoadingBlock';
import { SwipeableItem } from '@/components/SwipeableItem';
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

function getRecentDailyCounts(messages: SmsMessage[], dayCount = 7) {
  const now = Date.now();
  const counts = Array.from({ length: dayCount }, () => 0);

  for (const message of messages) {
    const parsed = new Date(message.date.replace(' ', 'T')).getTime();
    if (!Number.isFinite(parsed)) continue;
    const diffDays = Math.floor((now - parsed) / (24 * 60 * 60 * 1000));
    if (diffDays >= 0 && diffDays < dayCount) {
      counts[dayCount - 1 - diffDays] += 1;
    }
  }

  return counts;
}

function getRecentDailyLabels(dayCount = 7) {
  const now = Date.now();
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(now - (dayCount - 1 - index) * 24 * 60 * 60 * 1000);
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  });
}

export default function SmsPage() {
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const [direction, setDirection] = useState<DirectionFilter>('all');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [sync, setSync] = useState<SmsSyncStatus | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        pageSize: '50',
        filter: filter,
        direction: direction,
      });
      if (keyword) params.set('keyword', keyword);
      const data = await apiFetch<{
        messages?: SmsMessage[];
        total?: number;
        unread?: number;
        sync?: SmsSyncStatus | null;
        hasMore?: boolean;
      }>(`/api/dashboard/sms?${params.toString()}`, undefined, '获取短信失败');
      setMessages((prev) => append ? [...prev, ...(data.messages || [])] : (data.messages || []));
      setTotal(data.total || 0);
      setUnread(data.unread || 0);
      setSync(data.sync || null);
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '获取短信失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, direction, keyword]);

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
      await loadMessages(1, false);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : '同步短信失败');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadMessages(1, false); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMessages]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMessages(page + 1, true);
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, loadMessages]);

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
  const visibleMessages = messages;
  const inboundCount = messages.filter((message) => message.direction === 'inbound').length;
  const outboundCount = messages.filter((message) => message.direction === 'outbound').length;
  const recentDailyCounts = getRecentDailyCounts(messages);
  const dailyLabels = getRecentDailyLabels();

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / message channel"
        title="短信收件箱"
        description="短信会同步到本地数据库并保留完整内容。此页面只读，不会调用发送、删除或标记已读接口。"
        icon={<MessageSquareText className="h-6 w-6" />}
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
            chart: <OverviewBars values={recentDailyCounts} label="最近七天短信数量" />,
          },
          {
            label: '未读',
            value: `${unread} 条`,
            detail: unread > 0 ? '有待查看短信' : '全部已读',
            icon: <Mail className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={unread}
                total={Math.max(total, 1)}
                label="未读短信占比"
                className="text-warning"
              />
            ),
          },
          {
            label: '同步策略',
            value: sync?.enabled ? `每 ${sync.interval} 分钟` : '已暂停',
            detail: sync?.running ? '后台运行中' : '等待下一次同步',
            icon: <ShieldCheck className="h-3.5 w-3.5" />,
            chart: (
              <OverviewSegments
                segments={[
                  { label: '收到', value: inboundCount },
                  { label: '发出', value: outboundCount },
                ]}
                label="短信收发方向占比"
              />
            ),
          },
          {
            label: '最近同步',
            value: formatSyncTime(sync?.lastSyncedAt),
            detail: sync?.lastError ? '最近一次同步失败' : '状态正常',
            icon: <RefreshCw className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={sync?.running ? 1 : 0}
                total={1}
                centerLabel={sync?.running ? '运行' : '暂停'}
                label="短信同步运行状态"
                className={sync?.running ? 'text-success' : 'text-muted-foreground'}
              />
            ),
          },
        ]}
      />

      {!loading && messages.length > 0 ? (
        <ScrollReveal>
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="metric-icon size-8 rounded-lg"><BarChart3 className="h-4 w-4" /></span>
                近 7 天短信活跃
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThemedBarChart
                labels={dailyLabels}
                series={[{ label: '短信数量', values: recentDailyCounts }]}
                height={190}
                formatValue={(value) => `${value} 条`}
              />
            </CardContent>
          </Card>
        </ScrollReveal>
      ) : null}

      <section className="app-panel p-5 lg:p-7">
        <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">最近短信</h2>
            <p className="mt-1 text-sm text-muted-foreground">数据来自本地持久化副本；可按号码、内容和状态查询</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
            已加载 {visibleMessages.length} / {total} 条
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
            <button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground sm:w-auto transition hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
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
          <motion.div className="mt-5 grid gap-3" layout={reduce ? undefined : true}>
            <AnimatePresence mode="popLayout" initial={false}>
              {visibleMessages.map((message, index) => (
                <SwipeableItem key={`${message.id}-${index}`} onCopy={() => { void navigator.clipboard?.writeText(message.content || ''); }}>
                <motion.article
                  key={`${message.id}-${index}`}
                  layout={reduce ? undefined : 'position'}
                  initial={reduce ? undefined : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(index * 0.03, 0.3) }}
                  className="group grid min-w-0 gap-4 rounded-2xl border border-border/65 bg-muted/25 p-4 transition-colors hover:border-brand/20 hover:bg-muted/40 md:grid-cols-[minmax(0,.4fr)_minmax(0,1fr)] md:items-start xl:grid-cols-[minmax(0,.3fr)_minmax(0,1fr)_minmax(0,.25fr)]"
                >
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
                  <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground md:col-span-2 xl:col-span-1 xl:justify-end">
                    {message.unread ? <Badge variant="info">未读</Badge> : <Badge variant="secondary">已读</Badge>}
                    <span>{message.date || '未知时间'}</span>
                  </div>
                </motion.article>
                </SwipeableItem>
              ))}
            </AnimatePresence>
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                {loadingMore && <span className="text-sm text-muted-foreground">加载更多…</span>}
              </div>
            )}
          </motion.div>
        )}
      </section>
    </PageShell>
  );
}

