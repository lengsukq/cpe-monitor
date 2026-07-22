import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export default function HeroSection({
  eyebrow,
  title,
  description,
  actions,
  stats,
  className,
  children,
}: HeroSectionProps) {
  return (
    <section className={cn('app-panel relative overflow-hidden px-5 py-6 sm:px-6 sm:py-7 lg:px-8', className)}>
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div>
          {eyebrow ? (
            <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand/80 sm:text-xs sm:tracking-[0.2em]">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {stats ? <div className="relative mt-5">{stats}</div> : null}
      {children}
    </section>
  );
}
