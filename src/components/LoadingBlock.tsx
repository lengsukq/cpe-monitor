import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingBlockProps {
  className?: string;
  /** Compact header + grid skeleton used across list pages. */
  variant?: 'page' | 'cards' | 'table';
}

export function LoadingBlock({ className, variant = 'page' }: LoadingBlockProps) {
  if (variant === 'cards') {
    return (
      <div className={cn('fluid-card-grid gap-4 [--fluid-card-min:15rem]', className)}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-10 w-full rounded-xl" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-28 rounded-lg" />
        <Skeleton className="h-9 w-48 rounded-xl" />
        <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
      </div>
      <div className="fluid-card-grid gap-4 [--fluid-card-min:15rem]">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
