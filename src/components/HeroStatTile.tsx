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
}

export default function HeroStatTile({
  icon,
  label,
  value,
  detail,
  mono = false,
  href,
  className,
}: HeroStatTileProps) {
  const content = (
    <div className={cn(
      'min-w-0 rounded-2xl border border-white/10 bg-black/10 p-3 transition hover:bg-white/10 sm:p-4',
      className,
    )}>
      <p className="flex items-center gap-1.5 truncate text-[10px] text-white/60 sm:text-xs">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-sm font-semibold sm:text-lg',
          mono ? 'break-all font-mono text-xs sm:text-sm' : 'truncate',
        )}
      >
        {value}
      </p>
      {detail ? (
        <p className="mt-1 line-clamp-2 text-[10px] text-white/55 sm:truncate sm:text-xs">
          {detail}
        </p>
      ) : null}
    </div>
  );

  return href ? <Link href={href} className="block min-w-0">{content}</Link> : content;
}
