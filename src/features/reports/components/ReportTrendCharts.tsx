'use client';

import { useMemo } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemedBarChart } from '@/components/charts/BarChart';
import { ThemedAreaChart } from '@/components/charts/AreaChart';
import { ScrollReveal } from '@/components/motion';
import type { DailyReport } from '@/types';

interface ReportTrendChartsProps {
  reports: DailyReport[];
  loading: boolean;
}

const TREND_DAYS = 14;

export function ReportTrendCharts({ reports, loading }: ReportTrendChartsProps) {
  const trendData = useMemo(() => {
    // Take the most recent N days of reports, sorted ascending by date.
    const sorted = [...reports]
      .sort((a, b) => a.reportDate.localeCompare(b.reportDate))
      .slice(-TREND_DAYS);

    const labels = sorted.map((report) => {
      const date = new Date(report.reportDate);
      return Number.isNaN(date.getTime())
        ? report.reportDate
        : date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    });

    const toGb = (bytes: number | null) => Number(((bytes || 0) / 1e9).toFixed(2));

    return {
      labels,
      download: sorted.map((report) => toGb(report.totalDownload)),
      upload: sorted.map((report) => toGb(report.totalUpload)),
      uptime: sorted.map((report) => report.uptimePercent),
    };
  }, [reports]);

  if (loading || reports.length === 0) return null;

  return (
    <ScrollReveal>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="metric-icon size-8 rounded-lg"><BarChart3 className="h-4 w-4" /></span>
              近 {trendData.labels.length} 天流量趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemedBarChart
              labels={trendData.labels}
              series={[
                { label: '下载 (GB)', values: trendData.download },
                { label: '上传 (GB)', values: trendData.upload },
              ]}
              height={230}
              showLegend
              stacked
              formatValue={(value) => `${value} GB`}
            />
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="metric-icon size-8 rounded-lg"><TrendingUp className="h-4 w-4" /></span>
              网络质量趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemedAreaChart
              labels={trendData.labels}
              series={[
                { label: '在线率 (%)', values: trendData.uptime, fillAlpha: 14 },
              ]}
              height={230}
              showLegend
              yTitle="在线率 %"
              formatValue={(value) => `${value}%`}
            />
          </CardContent>
        </Card>
      </div>
    </ScrollReveal>
  );
}

export default ReportTrendCharts;
