'use client';

import { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DonutChart from '@/components/charts/DonutChart';
import { ThemedBarChart } from '@/components/charts/BarChart';
import { ScrollReveal } from '@/components/motion';
import { alertMetricOptions } from '@/features/alerts/model';
import type { ReturnTypeOfAlertStats } from './types';

interface AlertChartsPanelProps {
  stats: ReturnTypeOfAlertStats;
  total: number;
  loading: boolean;
}

export function AlertChartsPanel({ stats, total, loading }: AlertChartsPanelProps) {
  const distributionSegments = useMemo(
    () => alertMetricOptions
      .map((metric, index) => ({
        label: metric.label,
        value: stats.metricDistribution[index] ?? 0,
      }))
      .filter((segment) => segment.value > 0),
    [stats.metricDistribution],
  );

  if (loading || total === 0) return null;

  return (
    <ScrollReveal>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="metric-icon size-8 rounded-lg"><PieChart className="h-4 w-4" /></span>
              规则指标分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {distributionSegments.length > 0 ? (
              <DonutChart
                segments={distributionSegments}
                centerLabel={String(total)}
                centerSub="条规则"
                height={220}
              />
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">暂无规则数据</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="metric-icon size-8 rounded-lg"><PieChart className="h-4 w-4" /></span>
              启用状态与通知渠道
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ThemedBarChart
              labels={['已启用', '已禁用', '邮件通知', '企微通知']}
              series={[
                {
                  label: '规则数',
                  values: [stats.enabledCount, stats.disabledCount, stats.emailCount, stats.wechatCount],
                },
              ]}
              height={220}
              formatValue={(value) => `${value} 条`}
            />
          </CardContent>
        </Card>
      </div>
    </ScrollReveal>
  );
}

export default AlertChartsPanel;
