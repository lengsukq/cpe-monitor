import { Activity, Bell, BellOff, Mail } from 'lucide-react';
import { PageOverview } from '@/components/PageOverview';
import {
  OverviewBars,
  OverviewDonut,
  OverviewSegments,
} from '@/components/overview/OverviewMiniCharts';
import type { ReturnTypeOfAlertStats } from './types';

interface AlertRulesOverviewProps {
  total: number;
  loading: boolean;
  stats: ReturnTypeOfAlertStats;
}

export function AlertRulesOverview({ total, loading, stats }: AlertRulesOverviewProps) {
  return (
    <PageOverview
      eyebrow={<><Bell className="h-3.5 w-3.5" />Alerts / rules</>}
      title="告警概览"
      description="规则启用情况与通知覆盖，便于快速判断监控是否就绪。"
      items={[
        {
          label: '规则总数',
          value: loading ? '…' : String(total),
          detail: '已配置的告警规则',
          icon: <Bell className="h-3.5 w-3.5" />,
          chart: <OverviewBars values={stats.metricDistribution} label="告警指标类型分布" className="text-brand" />,
        },
        {
          label: '已启用',
          value: loading ? '…' : String(stats.enabledCount),
          detail: '当前生效的规则',
          icon: <Activity className="h-3.5 w-3.5" />,
          chart: <OverviewDonut value={stats.enabledCount} total={Math.max(total, 1)} label="已启用规则占比" className="text-success" />,
        },
        {
          label: '已禁用',
          value: loading ? '…' : String(stats.disabledCount),
          detail: '暂停监控的规则',
          icon: <BellOff className="h-3.5 w-3.5" />,
          chart: <OverviewDonut value={stats.disabledCount} total={Math.max(total, 1)} label="已禁用规则占比" className="text-muted-foreground" />,
        },
        {
          label: '邮件通知',
          value: loading ? '…' : String(stats.emailCount),
          detail: '会发送邮件的规则数',
          icon: <Mail className="h-3.5 w-3.5" />,
          chart: (
            <OverviewSegments
              segments={[
                { label: '邮件', value: stats.emailCount },
                { label: '企微', value: stats.wechatCount },
              ]}
              label="告警通知渠道覆盖"
            />
          ),
        },
      ]}
    />
  );
}
