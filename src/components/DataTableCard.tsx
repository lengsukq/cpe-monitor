import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
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
      <CardContent className="overflow-x-auto pt-6">
        {loading ? (
          <TableSkeleton />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>{columns}</TableRow>
            </TableHeader>
            <TableBody>
              {isEmpty ? <EmptyTableRow colSpan={colSpan} message={emptyMessage} /> : children}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
