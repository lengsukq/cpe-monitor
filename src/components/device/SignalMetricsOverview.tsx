import { Activity, RadioTower } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SignalMetricsOverviewProps {
  cell?: Record<string, unknown> | null;
}

interface SignalMetric {
  key: 'rsrp' | 'rsrq' | 'sinr' | 'rssi';
  label: string;
  unit: 'dBm' | 'dB';
  description: string;
  thresholds: [number, number, number];
}

const metrics: SignalMetric[] = [
  {
    key: 'rsrp',
    label: 'RSRP',
    unit: 'dBm',
    description: '5G/LTE 参考信号接收功率',
    thresholds: [-80, -90, -100],
  },
  {
    key: 'rsrq',
    label: 'RSRQ',
    unit: 'dB',
    description: '参考信号接收质量',
    thresholds: [-10, -15, -20],
  },
  {
    key: 'sinr',
    label: 'SINR',
    unit: 'dB',
    description: '信号与干扰噪声比',
    thresholds: [20, 13, 0],
  },
  {
    key: 'rssi',
    label: 'RSSI',
    unit: 'dBm',
    description: '接收信号总强度',
    thresholds: [-65, -75, -85],
  },
];

function parseMetricValue(value: unknown): number | null {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function getQuality(value: number | null, thresholds: [number, number, number]) {
  if (value === null) {
    return {
      label: '暂无数据',
      variant: 'secondary' as const,
      detail: '等待设备返回该指标',
    };
  }
  if (value >= thresholds[0]) {
    return {
      label: '优秀',
      variant: 'success' as const,
      detail: `≥ ${thresholds[0]}`,
    };
  }
  if (value >= thresholds[1]) {
    return {
      label: '良好',
      variant: 'info' as const,
      detail: `${thresholds[1]} 至 ${thresholds[0]}`,
    };
  }
  if (value >= thresholds[2]) {
    return {
      label: '一般',
      variant: 'warning' as const,
      detail: `${thresholds[2]} 至 ${thresholds[1]}`,
    };
  }
  return {
    label: '较差',
    variant: 'danger' as const,
    detail: `< ${thresholds[2]}`,
  };
}

function getMetricScore(value: number | null, thresholds: [number, number, number]) {
  if (value === null) return 0;
  const [excellent, good, fair] = thresholds;
  if (value >= excellent) return 100;
  if (value >= good) {
    return 75 + ((value - good) / Math.max(1, excellent - good)) * 25;
  }
  if (value >= fair) {
    return 45 + ((value - fair) / Math.max(1, good - fair)) * 30;
  }
  const lowerRange = Math.max(10, Math.abs(good - fair) * 2);
  return Math.max(5, 45 - ((fair - value) / lowerRange) * 40);
}

function getScoreTone(score: number) {
  if (score >= 75) return 'bg-success';
  if (score >= 45) return 'bg-warning';
  return 'bg-danger';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function resolveMetricValue(
  cell: Record<string, unknown> | null | undefined,
  key: SignalMetric['key'],
) {
  const signal = asRecord(cell?.signal);
  switch (key) {
    case 'rsrp':
      return parseMetricValue(cell?.rsrp ?? signal?.nrrsrp ?? signal?.rsrp);
    case 'rsrq':
      return parseMetricValue(cell?.rsrq ?? signal?.nrrsrq ?? signal?.rsrq);
    case 'sinr':
      return parseMetricValue(cell?.sinr ?? signal?.nrsinr ?? signal?.sinr);
    case 'rssi':
      return parseMetricValue(cell?.rssi ?? signal?.nrrssi ?? signal?.rssi);
  }
}

export default function SignalMetricsOverview({ cell }: SignalMetricsOverviewProps) {
  return (
    <Card className="card-hover">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          <RadioTower className="h-5 w-5 text-primary" />
          射频质量概览
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          数值与质量等级同时展示，便于快速判断覆盖强度、干扰和链路质量。
        </p>
      </CardHeader>
      <CardContent>
        <div className="fluid-card-grid gap-3 [--fluid-card-min:14rem]">
          {metrics.map((metric) => {
            const value = resolveMetricValue(cell, metric.key);
            const quality = getQuality(value, metric.thresholds);
            const score = getMetricScore(value, metric.thresholds);
            return (
              <div
                key={metric.key}
                className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{metric.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>
                  <Badge variant={quality.variant}>{quality.label}</Badge>
                </div>
                <div className="mt-4 flex items-end gap-1.5">
                  <span className="text-3xl font-semibold tabular-nums tracking-tight">
                    {value ?? '—'}
                  </span>
                  <span className="pb-1 text-sm text-muted-foreground">{metric.unit}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  当前等级参考：{quality.detail} {metric.unit}
                </p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>质量评分</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {value === null ? '—' : `${Math.round(score)} / 100`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${getScoreTone(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
