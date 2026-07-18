'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const CHART_LINE_WIDTH = 2;
const CHART_POINT_HOVER_RADIUS = 4;
const CHART_TENSION = 0.4;
const DOWNLOAD_FILL_ALPHA = 18;
const UPLOAD_FILL_ALPHA = 14;

interface TrafficData {
  timestamp: string;
  uploadBytes?: number | null;
  downloadBytes?: number | null;
}

interface TrafficChartProps {
  data: TrafficData[];
}

interface ChartTooltipContext {
  dataset: { label?: string };
  parsed: { y: number | null };
}

interface ChartThemeColors {
  download: string;
  upload: string;
  muted: string;
  border: string;
  card: string;
  foreground: string;
}

function readCssColor(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return value || fallback;
}

function readChartTheme(): ChartThemeColors {
  return {
    download: readCssColor('--chart-1', 'oklch(0.6 0.15 201)'),
    upload: readCssColor('--chart-2', 'oklch(0.6 0.13 175)'),
    muted: readCssColor('--muted-foreground', 'oklch(0.5 0 0)'),
    border: readCssColor('--border', 'oklch(0.9 0 0)'),
    card: readCssColor('--card', 'oklch(1 0 0)'),
    foreground: readCssColor('--foreground', 'oklch(0.15 0 0)'),
  };
}

export function TrafficChart({ data }: TrafficChartProps) {
  const { resolvedTheme } = useTheme();
  const [themeColors, setThemeColors] = useState<ChartThemeColors>(() => readChartTheme());

  useEffect(() => {
    // Re-read CSS variables after theme class changes on <html>.
    const frame = window.requestAnimationFrame(() => {
      setThemeColors(readChartTheme());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  const toMegabytes = (bytes: number | null | undefined) =>
    Number(((bytes || 0) / 1024 / 1024).toFixed(2));

  const chartData = useMemo(
    () => ({
      labels: data.map((entry) => {
        const date = new Date(`${entry.timestamp.replace(' ', 'T')}Z`);
        return date.toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Shanghai',
        });
      }),
      datasets: [
        {
          label: '下载',
          data: data.map((entry) => toMegabytes(entry.downloadBytes)),
          borderColor: themeColors.download,
          backgroundColor: `color-mix(in oklch, ${themeColors.download} ${DOWNLOAD_FILL_ALPHA}%, transparent)`,
          fill: true,
          tension: CHART_TENSION,
          pointRadius: 0,
          pointHoverRadius: CHART_POINT_HOVER_RADIUS,
          borderWidth: CHART_LINE_WIDTH,
        },
        {
          label: '上传',
          data: data.map((entry) => toMegabytes(entry.uploadBytes)),
          borderColor: themeColors.upload,
          backgroundColor: `color-mix(in oklch, ${themeColors.upload} ${UPLOAD_FILL_ALPHA}%, transparent)`,
          fill: true,
          tension: CHART_TENSION,
          pointRadius: 0,
          pointHoverRadius: CHART_POINT_HOVER_RADIUS,
          borderWidth: CHART_LINE_WIDTH,
        },
      ],
    }),
    [data, themeColors],
  );

  const options = useMemo(
    () => ({
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
            color: themeColors.muted,
            usePointStyle: true,
            pointStyle: 'circle' as const,
            boxWidth: 8,
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: themeColors.card,
          titleColor: themeColors.foreground,
          bodyColor: themeColors.foreground,
          borderColor: themeColors.border,
          borderWidth: 1,
          callbacks: {
            label: (context: ChartTooltipContext) => {
              return `${context.dataset.label || ''}: ${context.parsed.y ?? 0} MB`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: `color-mix(in oklch, ${themeColors.border} 70%, transparent)`,
          },
          ticks: { color: themeColors.muted, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: `color-mix(in oklch, ${themeColors.border} 70%, transparent)`,
          },
          ticks: { color: themeColors.muted },
          title: {
            display: true,
            text: '流量 (MB)',
            color: themeColors.muted,
          },
        },
      },
    }),
    [themeColors],
  );

  return <Line data={chartData} options={options} />;
}

export default TrafficChart;
