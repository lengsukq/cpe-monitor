'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDismissable } from '@/hooks/useDismissable';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

interface DateRangePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  className?: string;
}

const QUICK_OPTIONS: { label: string; getRange: () => DateRange }[] = [
  {
    label: '今天',
    getRange: () => {
      const d = new Date().toISOString().slice(0, 10);
      return { start: d, end: d };
    },
  },
  {
    label: '昨天',
    getRange: () => {
      const d = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      return { start: d, end: d };
    },
  },
  {
    label: '近7天',
    getRange: () => ({
      start: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
    }),
  },
  {
    label: '近30天',
    getRange: () => ({
      start: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
    }),
  },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDay(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStart, setTempStart] = useState<string | null>(value?.start || null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useDismissable(open, setOpen, [containerRef, btnRef]);

  const days = useMemo(() => {
    const total = getDaysInMonth(viewYear, viewMonth);
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    return { total, firstDayOfWeek };
  }, [viewYear, viewMonth]);

  const handleDayClick = useCallback((day: number) => {
    const dateStr = formatDay(viewYear, viewMonth, day);
    if (selecting === 'start') {
      setTempStart(dateStr);
      setSelecting('end');
    } else {
      const start = tempStart || dateStr;
      const end = dateStr;
      onChange(start <= end ? { start, end } : { start: end, end: start });
      setOpen(false);
      setSelecting('start');
    }
  }, [selecting, tempStart, viewYear, viewMonth, onChange]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const isInRange = (dateStr: string) => {
    if (!value) return false;
    return dateStr >= value.start && dateStr <= value.end;
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm transition-colors hover:bg-muted/50"
      >
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        {value ? `${value.start} ~ ${value.end}` : '选择日期范围'}
      </button>

      {open && (
        <div
          ref={containerRef}
          className="absolute left-0 top-[calc(100%+4px)] z-50 w-72 rounded-2xl border border-border bg-card p-3 shadow-xl"
        >
          {/* Quick options */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUICK_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                variant="outline"
                size="sm"
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => { onChange(opt.getRange()); setOpen(false); }}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Calendar header */}
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={prevMonth} className="rounded-lg p-1 hover:bg-muted">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">{viewYear}年{viewMonth + 1}月</span>
            <button type="button" onClick={nextMonth} className="rounded-lg p-1 hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <span key={d} className="py-1">{d}</span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: days.firstDayOfWeek }).map((_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: days.total }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatDay(viewYear, viewMonth, day);
              const inRange = isInRange(dateStr);
              const isStart = value?.start === dateStr;
              const isEnd = value?.end === dateStr;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'flex h-8 w-full items-center justify-center rounded-lg text-xs transition-colors',
                    inRange && 'bg-brand/10',
                    (isStart || isEnd) && 'bg-brand text-primary-foreground',
                    !inRange && !isStart && !isEnd && 'hover:bg-muted',
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {selecting === 'end' && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              已选开始: {tempStart}，点击结束日期
            </p>
          )}
        </div>
      )}
    </div>
  );
}
