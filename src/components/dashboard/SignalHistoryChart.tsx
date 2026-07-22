'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { Line } from 'react-chartjs-2';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { TrafficHistoryPoint } from '@/hooks/useDashboardData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

interface SignalHistoryChartProps {
  data: TrafficHistoryPoint[];
}

interface ThemeColors {
  rsrp: string;
  rsrq: string;
  sinr: string;
  rssi: string;
  muted: string;
  border: string;
  card: string;
  foreground: string;
}

interface TooltipContext {
  dataset: { label?: string };
  parsed: { y: number | null };
}

function readCssColor(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim() || fallback;
}

function readThemeColors(): ThemeColors {
  return {
    rsrp: readCssColor('--chart-1', 'oklch(0.6 0.15 201)'),
    rsrq: readCssColor('--chart-2', 'oklch(0.6 0.13 175)'),
    sinr: readCssColor('--chart-3', 'oklch(0.68 0.15 75)'),
    rssi: readCssColor('--chart-4', 'oklch(0.62 0.17 305)'),
    muted: readCssColor('--muted-foreground', 'oklch(0.5 0 0)'),
    border: readCssColor('--border', 'oklch(0.9 0 0)'),
    card: readCssColor('--card', 'oklch(1 0 0)'),
    foreground: readCssColor('--foreground', 'oklch(0.15 0 0)'),
  };
}

function formatLabel(timestamp: string, showDate: boolean): string {
  const date = new Date(`${timestamp.replace(' ', 'T')}Z`);
  return date.toLocaleString('zh-CN', {
    month: showDate ? '2-digit' : undefined,
    day: showDate ? '2-digit' : undefined,
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Shanghai',
  });
}

export default function SignalHistoryChart({ data }: SignalHistoryChartProps) {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ThemeColors>(() => readThemeColors());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setColors(readThemeColors()));
    return () => window.cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  const chartData = useMemo(() => {
    const first = data[0]?.timestamp;
    const last = data[data.length - 1]?.timestamp;
    const spanMs = first && last
      ? new Date(`${last.replace(' ', 'T')}Z`).getTime()
        - new Date(`${first.replace(' ', 'T')}Z`).getTime()
      : 0;
    const showDate = spanMs > 24 * 60 * 60 * 1000;

    return {
      labels: data.map((entry) => formatLabel(entry.timestamp, showDate)),
      datasets: [
        {
          label: 'RSRP',
          data: data.map((entry) => entry.rsrp ?? null),
          borderColor: colors.rsrp,
          backgroundColor: `color-mix(in oklch, ${colors.rsrp} 10%, transparent)`,
          yAxisID: 'dbm',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: false,
        },
        {
          label: 'RSSI',
          data: data.map((entry) => entry.rssi ?? null),
          borderColor: colors.rssi,
          backgroundColor: `color-mix(in oklch, ${colors.rssi} 10%, transparent)`,
          yAxisID: 'dbm',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 1.5,
          tension: 0.25,
          spanGaps: false,
        },
        {
          label: 'RSRQ',
          data: data.map((entry) => entry.rsrq ?? null),
          borderColor: colors.rsrq,
          backgroundColor: `color-mix(in oklch, ${colors.rsrq} 10%, transparent)`,
          yAxisID: 'db',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 1.5,
          tension: 0.25,
          spanGaps: false,
        },
        {
          label: 'SINR',
          data: data.map((entry) => entry.sinr ?? null),
          borderColor: colors.sinr,
          backgroundColor: `color-mix(in oklch, ${colors.sinr} 10%, transparent)`,
          yAxisID: 'db',
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          tension: 0.25,
          spanGaps: false,
        },
      ],
    };
  }, [colors, data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: colors.muted,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          boxWidth: 8,
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: colors.card,
        titleColor: colors.foreground,
        bodyColor: colors.foreground,
        borderColor: colors.border,
        borderWidth: 1,
        callbacks: {
          label: (context: TooltipContext) => {
            const unit = context.dataset.label === 'RSRP' || context.dataset.label === 'RSSI'
              ? 'dBm'
              : 'dB';
            return `${context.dataset.label || ''}: ${context.parsed.y ?? '-'} ${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: `color-mix(in oklch, ${colors.border} 65%, transparent)`,
        },
        ticks: {
          color: colors.muted,
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      dbm: {
        type: 'linear' as const,
        position: 'left' as const,
        suggestedMin: -130,
        suggestedMax: -40,
        grid: {
          color: `color-mix(in oklch, ${colors.border} 65%, transparent)`,
        },
        ticks: { color: colors.muted },
        title: {
          display: true,
          text: 'RSRP / RSSI (dBm)',
          color: colors.muted,
        },
      },
      db: {
        type: 'linear' as const,
        position: 'right' as const,
        suggestedMin: -30,
        suggestedMax: 40,
        grid: { drawOnChartArea: false },
        ticks: { color: colors.muted },
        title: {
          display: true,
          text: 'RSRQ / SINR (dB)',
          color: colors.muted,
        },
      },
    },
  }), [colors]);

  return <Line data={chartData} options={options} />;
}
