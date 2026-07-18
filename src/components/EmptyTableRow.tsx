import { TableCell, TableRow } from '@/components/ui/table';

interface EmptyTableRowProps {
  colSpan: number;
  message?: string;
}

export default function EmptyTableRow({
  colSpan,
  message = '暂无数据',
}: EmptyTableRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}
