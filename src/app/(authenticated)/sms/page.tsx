'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Mail, MessageSquareText, RadioTower, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Smartphone, X } from 'lucide-react';

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
      const response = await fetch('/api/dashboard/sms');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '获取短信失败');
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
      const response = await fetch('/api/dashboard/sms/sync', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '同步短信失败');
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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#102219] px-6 py-7 text-white shadow-2xl shadow-emerald-950/15 lg:px-9 lg:py-9">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 h-24 w-72 rounded-full bg-lime-200/10 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
              <RadioTower className="h-4 w-4" />
              CPE / message channel
            </div>
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight lg:text-5xl">短信收件箱</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/70">
              短信会同步到本地数据库并保留完整内容。此页面只读，不会调用发送、删除或标记已读接口。
            </p>
          </div>
          <button
            onClick={syncAndLoadMessages}
            disabled={loading || syncing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60 lg:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading || syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同步中…' : '同步并刷新'}
          </button>
        </div>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-xs text-emerald-100/60">本地收件箱</p>
            <p className="mt-1 text-2xl font-semibold">{total}<span className="ml-1 text-sm font-normal text-emerald-100/60">条</span></p>
          </div>
          <div className="rounded-2xl border border-emerald-200/20 bg-emerald-200/10 p-4">
            <p className="text-xs text-emerald-100/70">未读</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-200">{unread}<span className="ml-1 text-sm font-normal text-emerald-100/60">条</span></p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-xs text-emerald-100/60">同步策略</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-emerald-300" />{sync?.enabled ? `每 ${sync.interval} 分钟` : '已暂停'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
            <p className="text-xs text-emerald-100/60">最近同步</p>
            <p className="mt-1 text-sm font-medium">{formatSyncTime(sync?.lastSyncedAt)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card/80 p-5 shadow-sm lg:p-7">
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
              <input
                id="sms-search"
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="搜索号码、短信内容或时间"
                className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
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

        {error ? <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        {!error && sync?.lastError ? <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">上次自动同步失败：{sync.lastError}</div> : null}
        {loading ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">正在读取短信…</div>
        ) : visibleMessages.length === 0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <MessageSquareText className="h-8 w-8 opacity-40" />
            <p>{messages.length === 0 ? '暂无短信' : hasActiveQuery ? '没有符合条件的短信' : '没有短信'}</p>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-border">
            {visibleMessages.map((message, index) => (
              <article key={`${message.id}-${index}`} className="group grid gap-4 py-5 md:grid-cols-[minmax(150px,0.3fr)_minmax(0,1fr)_150px] md:items-start">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${message.unread ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {message.direction === 'inbound' ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{message.phone}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{message.direction === 'inbound' ? '收到' : '已发送'}</p>
                  </div>
                </div>
                <p className={`whitespace-pre-wrap text-sm leading-6 ${message.unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{message.content || '（无内容）'}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground md:justify-end">
                  {message.unread ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                  <span>{message.date || '未知时间'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatSyncTime(value: string | null | undefined) {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}
