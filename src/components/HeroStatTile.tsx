import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface HeroStatTileProps {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  mono?: boolean;
  href?: string;
  className?: string;
  chart?: ReactNode;
}

export default function HeroStatTile({
  icon,
  label,
  value,
  detail,
  mono = false,
  href,
  className,
  chart,
}: HeroStatTileProps) {
  const content = (
    <div className={cn(
      'flex h-full w-full min-w-0 flex-col rounded-2xl border border-border/65 bg-muted/35 p-3 transition hover:border-brand/20 hover:bg-muted/55 sm:p-4',
      className,
    )}>
      <p className="flex items-center gap-1.5 truncate text-[10px] font-semibold text-muted-foreground sm:text-xs">
        {icon ? <span className="text-brand">{icon}</span> : null}
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-sm font-bold text-foreground sm:text-lg',
          mono ? 'break-all font-mono text-xs sm:text-sm' : 'truncate',
        )}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground sm:truncate sm:text-xs">
          {detail}
        </p>
      ) : null}
      {chart ? <div className="mt-3 min-h-11">{chart}</div> : null}
    </div>
  );

  return href ? <Link href={href} className="block h-full min-w-0">{content}</Link> : content;
}
