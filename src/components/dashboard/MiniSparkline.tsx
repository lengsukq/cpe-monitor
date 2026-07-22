import { cn } from '@/lib/utils';

interface MiniSparklineProps {
  points: Array<number | null | undefined>;
  className?: string;
  fill?: boolean;
}

function buildPoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 3 - ((value - min) / range) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export default function MiniSparkline({ points, className, fill = true }: MiniSparklineProps) {
  const values = points
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .slice(-64);
  const width = 260;
  const height = 52;
  const linePoints = buildPoints(values, width, height);
  const areaPoints = linePoints ? `0,${height} ${linePoints} ${width},${height}` : '';

  if (values.length < 2) {
    return (
      <div
        className={cn(
          'flex h-12 items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 px-3 text-[10px] font-medium text-muted-foreground',
          className,
        )}
      >
        <span className="size-1.5 animate-pulse rounded-full bg-current" />
        正在积累实时趋势
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('h-12 w-full overflow-visible', className)}
      aria-hidden
    >
      {fill ? (
        <polygon points={areaPoints} fill="currentColor" opacity="0.12" />
      ) : null}
      <polyline
        points={linePoints}
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
