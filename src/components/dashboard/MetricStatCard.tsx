import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import MiniSparkline from './MiniSparkline';
import { cn } from '@/lib/utils';

interface MetricStatCardProps {
  label: string;
  value: string;
  color: string;
  href?: string;
  icon?: ReactNode;
  hint?: string;
  badge?: ReactNode;
  points?: Array<number | null | undefined>;
}

export default function MetricStatCard({
  label,
  value,
  color,
  href,
  icon,
  hint,
  badge,
  points = [],
}: MetricStatCardProps) {
  const card = (
    <Card className={cn('card-hover h-full min-h-[190px] min-w-0', href && 'cursor-pointer')}>
      <CardContent className="flex h-full flex-col pt-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className={cn('text-2xl font-extrabold tracking-tight sm:text-3xl', color)}>{value}</p>
              {badge}
            </div>
            {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          <span className={cn('metric-icon shrink-0', color)}>
            {icon}
          </span>
        </div>
        <div className={cn('mt-auto pt-4', color)}>
          <MiniSparkline points={points} />
        </div>
        {href ? (
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] font-semibold text-muted-foreground">
            查看详情 <ArrowUpRight className="h-3 w-3" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? (
    <Link href={href} aria-label={`查看${label}详情`} className="block h-full min-w-0">
      {card}
    </Link>
  ) : card;
}
