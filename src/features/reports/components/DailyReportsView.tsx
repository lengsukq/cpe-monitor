import { Clock3, Download, Eye, Signal, Upload, Wifi } from 'lucide-react';
import DataTableCard from '@/components/DataTableCard';
import ResponsiveDataView from '@/components/ResponsiveDataView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { formatBytes } from '@/lib/format';
import type { DailyReport } from '@/types';
import { getReportQualityVariant } from '../model';

interface DailyReportsViewProps {
  reports: DailyReport[];
  totalCount: number;
  loading: boolean;
  onOpen: (report: DailyReport) => void;
}

export function DailyReportsView({ reports, totalCount, loading, onOpen }: DailyReportsViewProps) {
  const emptyMessage = totalCount === 0 ? '暂无报告记录' : '没有符合条件的报告';
  return (
    <ResponsiveDataView
      loading={loading}
      isEmpty={reports.length === 0}
      emptyMessage={emptyMessage}
      mobile={reports.map((report) => {
        const totalTraffic = (report.totalDownload || 0) + (report.totalUpload || 0);
        return (
          <article key={report.id} className="rounded-[26px] border border-border/65 bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-base font-bold text-foreground">{report.reportDate}</p><p className="mt-1 text-xs text-muted-foreground">总流量 {formatBytes(totalTraffic)}</p></div>
              <Badge variant={getReportQualityVariant(report.networkQuality)}>{report.networkQuality || '未评级'}</Badge>
            </div>
            <div className="fluid-card-grid mt-4 gap-2 [--fluid-card-min:8.5rem]">
              <div className="rounded-2xl bg-brand/10 p-3"><p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><Download className="h-3 w-3 text-brand" />总下载</p><p className="mt-1 text-sm font-bold text-brand">{formatBytes(report.totalDownload)}</p></div>
              <div className="rounded-2xl bg-info/10 p-3"><p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><Upload className="h-3 w-3 text-info" />总上传</p><p className="mt-1 text-sm font-bold text-info">{formatBytes(report.totalUpload)}</p></div>
            </div>
            <div className="fluid-card-grid mt-3 gap-2 text-center [--fluid-card-min:6.75rem]">
              <div className="rounded-2xl bg-muted/35 p-2.5"><Clock3 className="mx-auto h-3.5 w-3.5 text-muted-foreground" /><p className="mt-1 text-xs font-bold">{report.peakHour !== null ? `${report.peakHour}:00` : '—'}</p><p className="mt-0.5 text-[9px] text-muted-foreground">峰值时段</p></div>
              <div className="rounded-2xl bg-muted/35 p-2.5"><Signal className="mx-auto h-3.5 w-3.5 text-warning" /><p className="mt-1 text-xs font-bold">{report.avgSignal ?? '—'} dBm</p><p className="mt-0.5 text-[9px] text-muted-foreground">平均信号</p></div>
              <div className="rounded-2xl bg-muted/35 p-2.5"><Wifi className="mx-auto h-3.5 w-3.5 text-success" /><p className="mt-1 text-xs font-bold">{report.uptimePercent?.toFixed(1) || 0}%</p><p className="mt-0.5 text-[9px] text-muted-foreground">完整率</p></div>
            </div>
            <Button type="button" variant="outline" className="mt-4 w-full rounded-xl" onClick={() => onOpen(report)}><Eye className="mr-2 h-4 w-4" />查看日报详情</Button>
          </article>
        );
      })}
      desktop={(
        <DataTableCard
          colSpan={8}
          loading={loading}
          isEmpty={reports.length === 0}
          emptyMessage={emptyMessage}
          columns={<><TableHead>日期</TableHead><TableHead>总下载</TableHead><TableHead>总上传</TableHead><TableHead>峰值时段</TableHead><TableHead>平均信号</TableHead><TableHead>网络质量</TableHead><TableHead>数据完整率</TableHead><TableHead>操作</TableHead></>}
        >
          {reports.map((report) => (
            <TableRow key={report.id}>
              <TableCell>{report.reportDate}</TableCell><TableCell>{formatBytes(report.totalDownload)}</TableCell><TableCell>{formatBytes(report.totalUpload)}</TableCell>
              <TableCell>{report.peakHour !== null ? `${report.peakHour}:00` : '-'}</TableCell><TableCell>{report.avgSignal ?? '—'} dBm</TableCell>
              <TableCell><Badge variant={getReportQualityVariant(report.networkQuality)}>{report.networkQuality || '-'}</Badge></TableCell>
              <TableCell>{report.uptimePercent?.toFixed(1) || 0}%</TableCell>
              <TableCell><Button size="sm" variant="ghost" onClick={() => onOpen(report)}><Eye className="mr-1 h-3.5 w-3.5" />详情</Button></TableCell>
            </TableRow>
          ))}
        </DataTableCard>
      )}
    />
  );
}
