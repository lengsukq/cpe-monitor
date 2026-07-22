'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { Line } from 'react-chartjs-2';
import { useThemeColor } from '@/hooks/useThemeColor';
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

interface DeviceCountHistoryChartProps {
  data: TrafficHistoryPoint[];
}

function readCssColor(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim() || fallback;
}

export default function DeviceCountHistoryChart({ data }: DeviceCountHistoryChartProps) {
  const { resolvedTheme } = useTheme();
  const { hue } = useThemeColor();
  const [colors, setColors] = useState(() => ({
    line: readCssColor('--chart-2', 'oklch(0.6 0.13 175)'),
    muted: readCssColor('--muted-foreground', 'oklch(0.5 0 0)'),
    border: readCssColor('--border', 'oklch(0.9 0 0)'),
    card: readCssColor('--card', 'oklch(1 0 0)'),
    foreground: readCssColor('--foreground', 'oklch(0.15 0 0)'),
  }));

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setColors({
      line: readCssColor('--chart-2', 'oklch(0.6 0.13 175)'),
      muted: readCssColor('--muted-foreground', 'oklch(0.5 0 0)'),
      border: readCssColor('--border', 'oklch(0.9 0 0)'),
      card: readCssColor('--card', 'oklch(1 0 0)'),
      foreground: readCssColor('--foreground', 'oklch(0.15 0 0)'),
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [resolvedTheme, hue]);

  const chartData = useMemo(() => ({
    labels: data.map((entry) => new Date(`${entry.timestamp.replace(' ', 'T')}Z`)
      .toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Shanghai',
      })),
    datasets: [{
      label: '在线设备',
      data: data.map((entry) => entry.connectedDevices ?? null),
      borderColor: colors.line,
      backgroundColor: `color-mix(in oklch, ${colors.line} 16%, transparent)`,
      fill: true,
      stepped: true,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      spanGaps: false,
    }],
  }), [colors.line, data]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.card,
        titleColor: colors.foreground,
        bodyColor: colors.foreground,
        borderColor: colors.border,
        borderWidth: 1,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => (
            `在线设备：${context.parsed.y ?? 0} 台`
          ),
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
          maxTicksLimit: 7,
        },
      },
      y: {
        beginAtZero: true,
        suggestedMax: Math.max(5, ...data.map((entry) => entry.connectedDevices || 0)),
        grid: {
          color: `color-mix(in oklch, ${colors.border} 65%, transparent)`,
        },
        ticks: {
          color: colors.muted,
          precision: 0,
          stepSize: 1,
        },
        title: {
          display: true,
          text: '设备数量',
          color: colors.muted,
        },
      },
    },
  }), [colors, data]);

  return <Line data={chartData} options={options} />;
}
