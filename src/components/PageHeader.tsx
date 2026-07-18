import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  bordered?: boolean;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon,
  className,
  bordered = false,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        bordered && 'border-b border-border/70 pb-6',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand/70">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-2.5 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl',
            eyebrow ? 'mt-2' : '',
          )}
        >
          {icon ? <span className="text-brand">{icon}</span> : null}
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto md:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}

export default PageHeader;
