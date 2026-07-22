import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TableSkeleton from '@/components/TableSkeleton';
import EmptyTableRow from '@/components/EmptyTableRow';
import { cn } from '@/lib/utils';

interface DataTableCardProps {
  title?: string;
  header?: ReactNode;
  columns: ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  colSpan: number;
  children: ReactNode;
  className?: string;
}

export default function DataTableCard({
  title,
  header,
  columns,
  loading = false,
  isEmpty = false,
  emptyMessage = '暂无数据',
  colSpan,
  children,
  className,
}: DataTableCardProps) {
  return (
    <Card className={cn('card-hover', className)}>
      {(title || header) ? (
        <CardHeader>
          {header || (title ? <CardTitle>{title}</CardTitle> : null)}
        </CardHeader>
      ) : null}
      <CardContent className="px-0 pt-0 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="px-4 py-5 sm:px-0 sm:py-0">
            <TableSkeleton />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 text-[10px] font-medium text-muted-foreground sm:hidden">
              <span>表格支持横向滑动</span>
              <span aria-hidden>左右滑动 →</span>
            </div>
            <div className="overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>{columns}</TableRow>
                </TableHeader>
                <TableBody>
                  {isEmpty ? <EmptyTableRow colSpan={colSpan} message={emptyMessage} /> : children}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
