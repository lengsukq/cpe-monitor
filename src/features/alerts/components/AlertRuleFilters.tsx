import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { AlertStatusFilter } from '../model';

interface AlertRuleFiltersProps {
  query: string;
  status: AlertStatusFilter;
  visibleCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: AlertStatusFilter) => void;
}

export function AlertRuleFilters({
  query,
  status,
  visibleCount,
  totalCount,
  onQueryChange,
  onStatusChange,
}: AlertRuleFiltersProps) {
  return (
    <section className="app-panel grid gap-3 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center sm:p-4">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索规则名称或监控指标"
          className="h-10 rounded-xl pl-9"
        />
      </div>
      <label className="relative min-w-0">
        <span className="sr-only">规则状态</span>
        <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as AlertStatusFilter)}
          className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
        >
          <option value="all">全部状态</option>
          <option value="enabled">已启用</option>
          <option value="disabled">已暂停</option>
        </select>
      </label>
      <span className="shrink-0 text-center text-xs text-muted-foreground sm:text-left">
        显示 {visibleCount} / {totalCount} 条
      </span>
    </section>
  );
}
