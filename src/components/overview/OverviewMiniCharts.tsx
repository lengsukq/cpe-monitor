import { cn } from '@/lib/utils';

function normalizeValues(values: Array<number | null | undefined>) {
  return values.filter((value): value is number => (
    typeof value === 'number' && Number.isFinite(value)
  ));
}

interface ChartProps {
  className?: string;
  label?: string;
}

interface SparklineProps extends ChartProps {
  values: Array<number | null | undefined>;
  fill?: boolean;
}

export function OverviewSparkline({
  values,
  className,
  label = '趋势图',
  fill = true,
}: SparklineProps) {
  const normalized = normalizeValues(values);
  const width = 160;
  const height = 42;

  if (normalized.length < 2) {
    return (
      <div className={cn(
        'flex h-11 items-center justify-center rounded-xl border border-dashed border-border/65 bg-background/45 text-[10px] font-medium text-muted-foreground',
        className,
      )}>
        数据积累中
      </div>
    );
  }

  const min = Math.min(...normalized);
  const max = Math.max(...normalized);
  const span = max - min || 1;
  const points = normalized.map((value, index) => {
    const x = (index / Math.max(1, normalized.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 8) - 4;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className={cn('h-11 w-full overflow-visible text-brand', className)}
      preserveAspectRatio="none"
    >
      {fill ? <polygon points={area} fill="currentColor" opacity="0.09" /> : null}
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

interface BarsProps extends ChartProps {
  values: Array<number | null | undefined>;
}

export function OverviewBars({ values, className, label = '柱状趋势图' }: BarsProps) {
  const normalized = normalizeValues(values);
  const max = Math.max(1, ...normalized);

  if (normalized.length === 0) {
    return (
      <div className={cn(
        'flex h-11 items-center justify-center rounded-xl border border-dashed border-border/65 bg-background/45 text-[10px] font-medium text-muted-foreground',
        className,
      )}>
        暂无分布数据
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex h-11 items-end gap-1 text-brand', className)}
    >
      {normalized.map((value, index) => (
        <span
          key={`${index}-${value}`}
          className="min-w-1 flex-1 rounded-t-sm bg-current opacity-75"
          style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

interface DonutProps extends ChartProps {
  value: number;
  total: number;
  centerLabel?: string;
}

export function OverviewDonut({
  value,
  total,
  centerLabel,
  className,
  label = '占比图',
}: DonutProps) {
  const safeTotal = Math.max(0, total);
  const safeValue = Math.min(Math.max(0, value), safeTotal || value);
  const percentage = safeTotal > 0 ? (safeValue / safeTotal) * 100 : 0;

  return (
    <div className={cn('flex items-center gap-3', className)} role="img" aria-label={label}>
      <div
        className="relative size-11 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(currentColor ${percentage}%, color-mix(in oklch, var(--muted), transparent 10%) 0)`,
        }}
      >
        <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-card text-[9px] font-bold text-foreground">
          {centerLabel ?? `${percentage.toFixed(0)}%`}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-current transition-[width] duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {safeValue} / {safeTotal}
        </p>
      </div>
    </div>
  );
}

interface Segment {
  label: string;
  value: number;
}

interface SegmentsProps extends ChartProps {
  segments: Segment[];
}

export function OverviewSegments({
  segments,
  className,
  label = '分类占比图',
}: SegmentsProps) {
  const validSegments = segments.filter((segment) => segment.value > 0);
  const total = validSegments.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return (
      <div className={cn(
        'flex h-11 items-center justify-center rounded-xl border border-dashed border-border/65 bg-background/45 text-[10px] font-medium text-muted-foreground',
        className,
      )}>
        暂无分类数据
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)} role="img" aria-label={label}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {validSegments.map((segment, index) => (
          <span
            key={segment.label}
            className={cn(
              'h-full',
              index % 4 === 0 && 'bg-brand',
              index % 4 === 1 && 'bg-info',
              index % 4 === 2 && 'bg-success',
              index % 4 === 3 && 'bg-warning',
            )}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {validSegments.slice(0, 4).map((segment) => (
          <span key={segment.label} className="whitespace-nowrap">
            {segment.label} {segment.value}
          </span>
        ))}
      </div>
    </div>
  );
}
