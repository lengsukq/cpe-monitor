import { CalendarDays, Download, Signal, Wifi } from 'lucide-react';
import { PageOverview } from '@/components/PageOverview';
import { OverviewBars, OverviewDonut, OverviewSparkline } from '@/components/overview/OverviewMiniCharts';
import { formatBytes } from '@/lib/format';
import type { getReportOverviewStats } from '../model';

interface DailyReportsOverviewProps {
  total: number;
  loading: boolean;
  overview: ReturnType<typeof getReportOverviewStats>;
}

export function DailyReportsOverview({ total, loading, overview }: DailyReportsOverviewProps) {
  const latest = overview.latestReport;
  return (
    <PageOverview
      eyebrow={<><CalendarDays className="h-3.5 w-3.5" />Reports / daily</>}
      title="报告概览"
      description="历史日报规模与最近一天的流量、质量摘要。"
      items={[
        {
          label: '报告天数', value: loading ? '…' : String(total), detail: '已生成的历史日报',
          icon: <CalendarDays className="h-3.5 w-3.5" />,
          chart: <OverviewBars values={overview.trafficTrend} label="最近日报总流量" className="text-brand" />,
        },
        {
          label: '最近日期', value: loading ? '…' : (latest?.reportDate || '—'),
          detail: latest ? `数据完整率 ${latest.uptimePercent?.toFixed(1) || 0}%` : '暂无数据',
          icon: <Wifi className="h-3.5 w-3.5" />,
          chart: <OverviewDonut value={latest?.uptimePercent || 0} total={100} label="最近日报数据完整率" className="text-success" />,
        },
        {
          label: '最近下载', value: loading ? '…' : formatBytes(latest?.totalDownload ?? null),
          detail: latest ? `上传 ${formatBytes(latest.totalUpload)}` : '—',
          icon: <Download className="h-3.5 w-3.5" />,
          chart: <OverviewSparkline values={overview.downloadTrend} label="最近日报下载流量趋势" className="text-info" />,
        },
        {
          label: '最近质量', value: loading ? '…' : (latest?.networkQuality || '—'),
          detail: latest ? `平均信号 ${latest.avgSignal || 0} dBm` : '—',
          icon: <Signal className="h-3.5 w-3.5" />,
          chart: <OverviewSparkline values={overview.signalTrend} label="最近日报平均信号趋势" className="text-warning" />,
        },
      ]}
    />
  );
}
