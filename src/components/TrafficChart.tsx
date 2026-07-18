'use client';

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

interface TrafficData {
  timestamp: string;
  uploadBytes: number | null;
  downloadBytes: number | null;
}

interface TrafficChartProps {
  data: TrafficData[];
}

interface ChartTooltipContext {
  dataset: { label?: string };
  parsed: { y: number | null };
}

function readCssColor(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return value || fallback;
}

export default function TrafficChart({ data }: TrafficChartProps) {
  // The API stores byte counters. Keep the chart numeric and use one fixed
  // unit so the y-axis and tooltip always describe the plotted values.
  const toMegabytes = (bytes: number | null) =>
    Number(((bytes || 0) / 1024 / 1024).toFixed(2));

  const downloadColor = readCssColor('--chart-1', 'oklch(0.6 0.15 201)');
  const uploadColor = readCssColor('--chart-2', 'oklch(0.6 0.13 175)');
  const mutedColor = readCssColor('--muted-foreground', 'oklch(0.5 0 0)');
  const borderColor = readCssColor('--border', 'oklch(0.9 0 0)');

  const chartData = {
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
        borderColor: downloadColor,
        backgroundColor: `color-mix(in oklch, ${downloadColor} 18%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      {
        label: '上传',
        data: data.map((entry) => toMegabytes(entry.uploadBytes)),
        borderColor: uploadColor,
        backgroundColor: `color-mix(in oklch, ${uploadColor} 14%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
    ],
  };

  const options = {
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
          color: mutedColor,
          usePointStyle: true,
          pointStyle: 'circle' as const,
          boxWidth: 8,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: ChartTooltipContext) => {
            return `${context.dataset.label || ''}: ${context.parsed.y ?? 0} MB`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: `color-mix(in oklch, ${borderColor} 70%, transparent)` },
        ticks: { color: mutedColor, maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: `color-mix(in oklch, ${borderColor} 70%, transparent)` },
        ticks: { color: mutedColor },
        title: {
          display: true,
          text: '流量 (MB)',
          color: mutedColor,
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
