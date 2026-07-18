import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
  rows?: number;
  className?: string;
}

export default function TableSkeleton({ rows = 5, className }: TableSkeletonProps) {
  return (
    <div className={className ? `space-y-2 ${className}` : 'space-y-2'}>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12" />
      ))}
    </div>
  );
}
