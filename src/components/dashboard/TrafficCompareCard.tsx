'use client';

import { useCallback, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { GitCompareArrows } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useChartTheme, buildTooltipOptions, buildLegendOptions, CHART_DEFAULTS } from '@/lib/chart-theme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface TrafficCompareCardProps {
  className?: string;
}

interface CompareData {
  labels: string[];
  download: number[];
  upload: number[];
}

const RANGE_OPTIONS = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
];

function getDateRange(range: string): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (range) {
    case 'today':
      return { start: fmt(now), end: fmt(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case '7d': {
      const s = new Date(now);
      s.setDate(s.getDate() - 7);
      return { start: fmt(s), end: fmt(now) };
    }
    case '30d': {
      const s = new Date(now);
      s.setDate(s.getDate() - 30);
      return { start: fmt(s), end: fmt(now) };
    }
    default:
      return { start: fmt(now), end: fmt(now) };
  }
}

export default function TrafficCompareCard({ className }: TrafficCompareCardProps) {
  const themeColors = useChartTheme();
  const [rangeA, setRangeA] = useState('today');
  const [rangeB, setRangeB] = useState('yesterday');
  const [dataA, setDataA] = useState<CompareData | null>(null);
  const [dataB, setDataB] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRange = useCallback(async (range: string): Promise<CompareData | null> => {
    const { start, end } = getDateRange(range);
    try {
      const res = await fetch(`/api/dashboard/traffic-history?range=custom&start=${start}&end=${end}`);
      if (!res.ok) return null;
      const json = await res.json();
      const points = json.data || json || [];
      return {
        labels: points.map((p: { timestamp: string }) => {
          const d = new Date(`${p.timestamp.replace(' ', 'T')}Z`);
          return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' });
        }),
        download: points.map((p: { downloadBps?: number }) => Number(((p.downloadBps || 0) / 1_000_000).toFixed(3))),
        upload: points.map((p: { uploadBps?: number }) => Number(((p.uploadBps || 0) / 1_000_000).toFixed(3))),
      };
    } catch {
      return null;
    }
  }, []);

  const handleCompare = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([fetchRange(rangeA), fetchRange(rangeB)]);
    setDataA(a);
    setDataB(b);
    setLoading(false);
  }, [rangeA, rangeB, fetchRange]);

  const chartData = useMemo(() => {
    if (!dataA && !dataB) return null;
    const maxLen = Math.max(dataA?.labels.length || 0, dataB?.labels.length || 0);
    const labels = (dataA?.labels.length || 0) >= (dataB?.labels.length || 0)
      ? dataA!.labels
      : dataB!.labels;

    return {
      labels: labels.slice(0, maxLen),
      datasets: [
        ...(dataA ? [{
          label: `下载 (${RANGE_OPTIONS.find((r) => r.value === rangeA)?.label || rangeA})`,
          data: dataA.download,
          borderColor: themeColors.primary,
          backgroundColor: 'transparent',
          tension: CHART_DEFAULTS.tension,
          pointRadius: 0,
          pointHoverRadius: CHART_DEFAULTS.pointHoverRadius,
          borderWidth: CHART_DEFAULTS.lineWidth,
        }] : []),
        ...(dataB ? [{
          label: `下载 (${RANGE_OPTIONS.find((r) => r.value === rangeB)?.label || rangeB})`,
          data: dataB.download,
          borderColor: themeColors.secondary,
          backgroundColor: 'transparent',
          borderDash: [5, 3],
          tension: CHART_DEFAULTS.tension,
          pointRadius: 0,
          pointHoverRadius: CHART_DEFAULTS.pointHoverRadius,
          borderWidth: CHART_DEFAULTS.lineWidth,
        }] : []),
      ],
    };
  }, [dataA, dataB, rangeA, rangeB, themeColors]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, ...buildLegendOptions(themeColors) },
      tooltip: {
        ...buildTooltipOptions(themeColors),
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            `${ctx.dataset.label || ''}: ${ctx.parsed.y ?? 0} Mbps`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: `color-mix(in oklch, ${themeColors.border} 70%, transparent)` },
        ticks: { color: themeColors.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
      },
      y: {
        beginAtZero: true,
        grid: { color: `color-mix(in oklch, ${themeColors.border} 70%, transparent)` },
        ticks: { color: themeColors.muted },
        title: { display: true, text: '下载速率 (Mbps)', color: themeColors.muted },
      },
    },
  }), [themeColors]);

  return (
    <Card className={`card-hover py-4 sm:py-5 ${className || ''}`}>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
            流量对比
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">A:</span>
              {RANGE_OPTIONS.map((r) => (
                <Button
                  key={r.value}
                  size="sm"
                  variant={rangeA === r.value ? 'default' : 'outline'}
                  className="h-7 rounded-full px-2 text-[11px]"
                  onClick={() => setRangeA(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">B:</span>
              {RANGE_OPTIONS.map((r) => (
                <Button
                  key={r.value}
                  size="sm"
                  variant={rangeB === r.value ? 'default' : 'outline'}
                  className="h-7 rounded-full px-2 text-[11px]"
                  onClick={() => setRangeB(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <Button size="sm" onClick={() => void handleCompare()} disabled={loading}>
              {loading ? '加载中…' : '对比'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="h-44 sm:h-64">
          {chartData ? (
            <Line data={chartData} options={options} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              选择两个时间范围后点击"对比"查看叠加曲线
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
