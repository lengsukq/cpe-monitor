'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  /** Stagger index for entrance delay. */
  index?: number;
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
  index = 0,
}: MetricStatCardProps) {
  const reduce = useReducedMotion();

  const card = (
    <Card className={cn('h-full min-h-[120px] min-w-0 shadow-card transition-[border-color] duration-200 hover:border-brand/20 sm:min-h-[160px] lg:min-h-[190px]', href && 'cursor-pointer')}>
      <CardContent className="flex h-full flex-col pt-0">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground sm:text-sm">{label}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-4">
              <p className={cn('text-lg font-extrabold tracking-tight sm:text-2xl lg:text-3xl', color)}>{value}</p>
              {badge}
            </div>
            {hint ? <p className="mt-2 hidden text-xs text-muted-foreground sm:block">{hint}</p> : null}
          </div>
          <span className={cn('metric-icon shrink-0', color)}>
            {icon}
          </span>
        </div>
        <div className={cn('mt-auto hidden pt-2 sm:block sm:pt-4', color)}>
          <MiniSparkline points={points} />
        </div>
        {href ? (
          <div className="mt-1 hidden items-center justify-end gap-1 text-[11px] font-semibold text-muted-foreground sm:flex">
            查看详情 <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const content = href ? (
    <Link href={href} aria-label={`查看${label}详情`} className="group block h-full min-w-0">
      {card}
    </Link>
  ) : card;

  if (reduce) return content;

  return (
    <motion.div
      className="h-full min-w-0"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + index * 0.07, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {content}
    </motion.div>
  );
}
