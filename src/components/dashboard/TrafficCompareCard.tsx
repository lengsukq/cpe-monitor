'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { apiFetch } from '@/lib/client-api';
import { getAppDateKey, parseDateTime } from '@/lib/date-time';
import { formatBytes } from '@/lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface TrafficCompareCardProps {
  className?: string;
}

interface RawTrafficPoint {
  timestamp: string;
  uploadBytes?: number | null;
  downloadBytes?: number | null;
  uploadBps?: number | null;
  downloadBps?: number | null;
}

interface ComparePoint {
  bucketIndex: number;
  label: string;
  downloadMbps: number;
  uploadMbps: number;
}

interface CompareSeries {
  range: string;
  points: ComparePoint[];
  totalDownloadBytes: number;
  totalUploadBytes: number;
  avgDownloadMbps: number;
  avgUploadMbps: number;
  sampleCount: number;
}

type CompareMetric = 'download' | 'upload';

const RANGE_OPTIONS = [
  { label: '今天', value: 'today' },
  { label: '昨天', value: 'yesterday' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
] as const;

function shiftAppDateKey(daysDelta: number): string {
  const todayKey = getAppDateKey(new Date());
  const midnight = new Date(`${todayKey}T00:00:00+08:00`).getTime();
  return getAppDateKey(new Date(midnight + daysDelta * 24 * 60 * 60 * 1000));
}

function getDateRange(range: string): { start: string; end: string } {
  const today = shiftAppDateKey(0);
  switch (range) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday': {
      const yesterday = shiftAppDateKey(-1);
      return { start: yesterday, end: yesterday };
    }
    case '7d':
      return { start: shiftAppDateKey(-6), end: today };
    case '30d':
      return { start: shiftAppDateKey(-29), end: today };
    default:
      return { start: today, end: today };
  }
}

function getShanghaiMinuteOfDay(timestamp: string): number {
  const parsed = parseDateTime(timestamp);
  if (!parsed) return 0;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);
  const hourRaw = Number(parts.find((p) => p.type === 'hour')?.value || '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value || '0');
  const hour = hourRaw === 24 ? 0 : hourRaw;
  return hour * 60 + minute;
}

function buildCompareSeries(range: string, points: RawTrafficPoint[]): CompareSeries {
  const isSingleDay = range === 'today' || range === 'yesterday';
  let totalDownloadBytes = 0;
  let totalUploadBytes = 0;

  if (isSingleDay) {
    // Group into 24 hourly buckets (00:00..23:00) so today vs yesterday align by time of day.
    const buckets = Array.from({ length: 24 }, () => ({ dlSum: 0, ulSum: 0, count: 0 }));
    for (const point of points) {
      totalDownloadBytes += point.downloadBytes || 0;
      totalUploadBytes += point.uploadBytes || 0;
      const hour = Math.min(23, Math.max(0, Math.floor(getShanghaiMinuteOfDay(point.timestamp) / 60)));
      buckets[hour].dlSum += (point.downloadBps || 0) / 1_000_000;
      buckets[hour].ulSum += (point.uploadBps || 0) / 1_000_000;
      buckets[hour].count += 1;
    }
    const comparePoints: ComparePoint[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      const b = buckets[hour];
      if (b.count === 0) continue;
      comparePoints.push({
        bucketIndex: hour,
        label: `${String(hour).padStart(2, '0')}:00`,
        downloadMbps: Number((b.dlSum / b.count).toFixed(3)),
        uploadMbps: Number((b.ulSum / b.count).toFixed(3)),
      });
    }
    const avgDownloadMbps = points.length > 0
      ? Number((points.reduce((acc, p) => acc + (p.downloadBps || 0), 0) / points.length / 1_000_000).toFixed(2))
      : 0;
    const avgUploadMbps = points.length > 0
      ? Number((points.reduce((acc, p) => acc + (p.uploadBps || 0), 0) / points.length / 1_000_000).toFixed(2))
      : 0;
    return {
      range,
      points: comparePoints,
      totalDownloadBytes,
      totalUploadBytes,
      avgDownloadMbps,
      avgUploadMbps,
      sampleCount: points.length,
    };
  }

  // Multi-day ranges: group by Asia/Shanghai calendar day, indexed from Day 1..N.
  const dayBuckets = new Map<string, { dlSum: number; ulSum: number; count: number }>();
  for (const point of points) {
    totalDownloadBytes += point.downloadBytes || 0;
    totalUploadBytes += point.uploadBytes || 0;
    const parsed = parseDateTime(point.timestamp);
    if (!parsed) continue;
    const dayKey = getAppDateKey(parsed);
    const existing = dayBuckets.get(dayKey) || { dlSum: 0, ulSum: 0, count: 0 };
    existing.dlSum += (point.downloadBps || 0) / 1_000_000;
    existing.ulSum += (point.uploadBps || 0) / 1_000_000;
    existing.count += 1;
    dayBuckets.set(dayKey, existing);
  }

  const sortedDays = [...dayBuckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const comparePoints: ComparePoint[] = sortedDays.map(([, b], idx) => ({
    bucketIndex: idx,
    label: `第${idx + 1}天`,
    downloadMbps: Number((b.dlSum / b.count).toFixed(3)),
    uploadMbps: Number((b.ulSum / b.count).toFixed(3)),
  }));
  const avgDownloadMbps = points.length > 0
    ? Number((points.reduce((acc, p) => acc + (p.downloadBps || 0), 0) / points.length / 1_000_000).toFixed(2))
    : 0;
  const avgUploadMbps = points.length > 0
    ? Number((points.reduce((acc, p) => acc + (p.uploadBps || 0), 0) / points.length / 1_000_000).toFixed(2))
    : 0;

  return {
    range,
    points: comparePoints,
    totalDownloadBytes,
    totalUploadBytes,
    avgDownloadMbps,
    avgUploadMbps,
    sampleCount: points.length,
  };
}

export default function TrafficCompareCard({ className }: TrafficCompareCardProps) {
  const themeColors = useChartTheme();
  const [rangeA, setRangeA] = useState('today');
  const [rangeB, setRangeB] = useState('yesterday');
  const [metric, setMetric] = useState<CompareMetric>('download');
  const [dataA, setDataA] = useState<CompareSeries | null>(null);
  const [dataB, setDataB] = useState<CompareSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRange = useCallback(async (range: string): Promise<CompareSeries> => {
    const { start, end } = getDateRange(range);
    const points = await apiFetch<RawTrafficPoint[]>(
      `/api/dashboard/traffic?range=custom&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      '获取对比流量失败',
    );
    return buildCompareSeries(range, Array.isArray(points) ? points : []);
  }, []);

  const handleCompare = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [a, b] = await Promise.all([fetchRange(rangeA), fetchRange(rangeB)]);
      setDataA(a);
      setDataB(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取流量对比数据失败');
    } finally {
      setLoading(false);
    }
  }, [rangeA, rangeB, fetchRange]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void handleCompare();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [handleCompare]);

  const chartData = useMemo(() => {
    if (!dataA && !dataB) return null;
    if ((dataA?.points.length || 0) === 0 && (dataB?.points.length || 0) === 0) return null;

    const bucketMap = new Map<number, string>();
    for (const p of dataA?.points || []) {
      if (!bucketMap.has(p.bucketIndex)) bucketMap.set(p.bucketIndex, p.label);
    }
    for (const p of dataB?.points || []) {
      if (!bucketMap.has(p.bucketIndex)) bucketMap.set(p.bucketIndex, p.label);
    }
    const sortedBuckets = [...bucketMap.entries()].sort((a, b) => a[0] - b[0]);
    const labels = sortedBuckets.map(([, label]) => label);

    const mapValue = (series: CompareSeries | null, bucketIndex: number): number | null => {
      const hit = series?.points.find((p) => p.bucketIndex === bucketIndex);
      if (!hit) return null;
      return metric === 'download' ? hit.downloadMbps : hit.uploadMbps;
    };

    const metricLabel = metric === 'download' ? '下载' : '上传';
    const labelA = RANGE_OPTIONS.find((r) => r.value === rangeA)?.label || rangeA;
    const labelB = RANGE_OPTIONS.find((r) => r.value === rangeB)?.label || rangeB;

    return {
      labels,
      datasets: [
        ...(dataA && dataA.points.length > 0 ? [{
          label: `${metricLabel} · ${labelA}`,
          data: sortedBuckets.map(([idx]) => mapValue(dataA, idx)),
          borderColor: themeColors.primary,
          backgroundColor: 'transparent',
          spanGaps: true,
          tension: CHART_DEFAULTS.tension,
          pointRadius: 2,
          pointHoverRadius: CHART_DEFAULTS.pointHoverRadius,
          borderWidth: CHART_DEFAULTS.lineWidth,
        }] : []),
        ...(dataB && dataB.points.length > 0 ? [{
          label: `${metricLabel} · ${labelB}`,
          data: sortedBuckets.map(([idx]) => mapValue(dataB, idx)),
          borderColor: themeColors.secondary,
          backgroundColor: 'transparent',
          borderDash: [5, 3],
          spanGaps: true,
          tension: CHART_DEFAULTS.tension,
          pointRadius: 2,
          pointHoverRadius: CHART_DEFAULTS.pointHoverRadius,
          borderWidth: CHART_DEFAULTS.lineWidth,
        }] : []),
      ],
    };
  }, [dataA, dataB, metric, rangeA, rangeB, themeColors]);

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
        ticks: { color: themeColors.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
      },
      y: {
        beginAtZero: true,
        grid: { color: `color-mix(in oklch, ${themeColors.border} 70%, transparent)` },
        ticks: { color: themeColors.muted },
        title: {
          display: true,
          text: metric === 'download' ? '平均下载速率 (Mbps)' : '平均上传速率 (Mbps)',
          color: themeColors.muted,
        },
      },
    },
  }), [metric, themeColors]);

  const labelA = RANGE_OPTIONS.find((r) => r.value === rangeA)?.label || rangeA;
  const labelB = RANGE_OPTIONS.find((r) => r.value === rangeB)?.label || rangeB;

  return (
    <Card className={`card-hover py-4 sm:py-5 ${className || ''}`}>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
            流量对比
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-muted/50 p-0.5">
              <Button
                size="sm"
                variant={metric === 'download' ? 'default' : 'ghost'}
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => setMetric('download')}
              >
                下载
              </Button>
              <Button
                size="sm"
                variant={metric === 'upload' ? 'default' : 'ghost'}
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={() => setMetric('upload')}
              >
                上传
              </Button>
            </div>
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
              {loading ? '加载中…' : '刷新对比'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {dataA && dataB && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2 text-xs">
              <span className="font-medium text-foreground">时段 A（{labelA}）</span>
              <span className="ml-2 text-muted-foreground">
                下载 {formatBytes(dataA.totalDownloadBytes)} · 上传 {formatBytes(dataA.totalUploadBytes)} · 均速 {metric === 'download' ? dataA.avgDownloadMbps : dataA.avgUploadMbps} Mbps（{dataA.sampleCount} 个采样点）
              </span>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/25 px-3 py-2 text-xs">
              <span className="font-medium text-foreground">时段 B（{labelB}）</span>
              <span className="ml-2 text-muted-foreground">
                下载 {formatBytes(dataB.totalDownloadBytes)} · 上传 {formatBytes(dataB.totalUploadBytes)} · 均速 {metric === 'download' ? dataB.avgDownloadMbps : dataB.avgUploadMbps} Mbps（{dataB.sampleCount} 个采样点）
              </span>
            </div>
          </div>
        )}
        <div className="h-44 sm:h-64">
          {error ? (
            <div className="flex h-full items-center justify-center text-sm text-danger">
              {error}
            </div>
          ) : chartData ? (
            <Line data={chartData} options={options} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {loading ? '正在加载流量对比数据…' : '所选时间段暂无流量采集记录'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
