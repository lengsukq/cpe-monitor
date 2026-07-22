import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ResponsiveDataViewProps {
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  mobile: ReactNode;
  desktop: ReactNode;
  mobileClassName?: string;
  skeletonCount?: number;
}

export default function ResponsiveDataView({
  loading = false,
  isEmpty = false,
  emptyMessage = '暂无数据',
  mobile,
  desktop,
  mobileClassName,
  skeletonCount = 3,
}: ResponsiveDataViewProps) {
  return (
    <>
      <div className={cn('fluid-card-grid gap-3 [--fluid-card-min:18rem] lg:hidden', mobileClassName)}>
        {loading ? (
          Array.from({ length: skeletonCount }).map((_, index) => (
            <div
              key={index}
              className="rounded-[24px] border border-border/65 bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-lg" />
                </div>
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
              <div className="fluid-card-grid mt-4 gap-2 [--fluid-card-min:8rem]">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
              </div>
              <Skeleton className="mt-3 h-9 rounded-xl" />
            </div>
          ))
        ) : isEmpty ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-card/75 px-6 text-center shadow-sm [grid-column:1/-1]">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Inbox className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">{emptyMessage}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              新数据出现后会自动显示在这里。
            </p>
          </div>
        ) : mobile}
      </div>

      <div className="hidden lg:block">{desktop}</div>
    </>
  );
}
