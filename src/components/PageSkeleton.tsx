import { Skeleton } from '@/components/ui/skeleton';

interface PageSkeletonProps {
  cards?: number;
  showChart?: boolean;
}

export default function PageSkeleton({ cards = 4, showChart = true }: PageSkeletonProps) {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <div className="fluid-card-grid gap-4 [--fluid-card-min:15rem]">
        {Array.from({ length: cards }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      {showChart ? <Skeleton className="h-96 rounded-2xl" /> : <Skeleton className="h-64 rounded-2xl" />}
    </div>
  );
}
