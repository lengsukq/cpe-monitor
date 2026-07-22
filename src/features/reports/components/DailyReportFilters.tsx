import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DailyReportFiltersProps {
  query: string;
  quality: string;
  qualityOptions: string[];
  visibleCount: number;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onQualityChange: (value: string) => void;
}

export function DailyReportFilters({
  query,
  quality,
  qualityOptions,
  visibleCount,
  totalCount,
  onQueryChange,
  onQualityChange,
}: DailyReportFiltersProps) {
  return (
    <section className="app-panel grid gap-3 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center sm:p-4">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索报告日期、网络质量或信号值" className="h-10 rounded-xl pl-9" />
      </div>
      <label className="relative min-w-0">
        <span className="sr-only">网络质量</span>
        <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select value={quality} onChange={(event) => onQualityChange(event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30">
          <option value="all">全部网络质量</option>
          {qualityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <span className="shrink-0 text-center text-xs text-muted-foreground sm:text-left">显示 {visibleCount} / {totalCount} 天</span>
    </section>
  );
}
