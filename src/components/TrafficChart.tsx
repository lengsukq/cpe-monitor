'use client';

import { useMemo } from 'react';
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
import zoomPlugin from 'chartjs-plugin-zoom';
import 'hammerjs';
import {
  useChartTheme,
  buildTooltipOptions,
  buildLegendOptions,
  CHART_DEFAULTS,
} from '@/lib/chart-theme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
);

const DOWNLOAD_FILL_ALPHA = 18;
const UPLOAD_FILL_ALPHA = 14;

interface TrafficData {
  timestamp: string;
  uploadBytes?: number | null;
  downloadBytes?: number | null;
  uploadBps?: number | null;
  downloadBps?: number | null;
  networkType?: string | null;
  band?: string | null;
  connectedDevices?: number | null;
}

interface TrafficChartProps {
  data: TrafficData[];
}

export function TrafficChart({ data }: TrafficChartProps) {
  const themeColors = useChartTheme();

  const toMegabitsPerSecond = (bitsPerSecond: number | null | undefined) =>
    Number(((bitsPerSecond || 0) / 1_000_000).toFixed(3));

  const chartData = useMemo(
    () => {
      const firstTimestamp = data[0]?.timestamp;
      const lastTimestamp = data[data.length - 1]?.timestamp;
      const spanMs = firstTimestamp && lastTimestamp
        ? new Date(`${lastTimestamp.replace(' ', 'T')}Z`).getTime()
          - new Date(`${firstTimestamp.replace(' ', 'T')}Z`).getTime()
        : 0;

      return ({
      labels: data.map((entry) => {
        const date = new Date(`${entry.timestamp.replace(' ', 'T')}Z`);
        return date.toLocaleString('zh-CN', {
          month: spanMs > 24 * 60 * 60 * 1000 ? '2-digit' : undefined,
          day: spanMs > 24 * 60 * 60 * 1000 ? '2-digit' : undefined,
          hour: '2-digit',
          minute: spanMs <= 7 * 24 * 60 * 60 * 1000 ? '2-digit' : undefined,
          timeZone: 'Asia/Shanghai',
        });
      }),
      datasets: [
        {
          label: '下载',
          data: data.map((entry) => toMegabitsPerSecond(entry.downloadBps)),
          borderColor: themeColors.primary,
          backgroundColor: `color-mix(in oklch, ${themeColors.primary} ${DOWNLOAD_FILL_ALPHA}%, transparent)`,
          fill: true,
          tension: CHART_DEFAULTS.tension,
          pointRadius: 0,
          pointHoverRadius: CHART_DEFAULTS.pointHoverRadius,
          borderWidth: CHART_DEFAULTS.lineWidth,
        },
        {
          label: '上传',
          data: data.map((entry) => toMegabitsPerSecond(entry.uploadBps)),
          borderColor: themeColors.secondary,
          backgroundColor: `color-mix(in oklch, ${themeColors.secondary} ${UPLOAD_FILL_ALPHA}%, transparent)`,
          fill: true,
          tension: CHART_DEFAULTS.tension,
          pointRadius: 0,
          pointHoverRadius: CHART_DEFAULTS.pointHoverRadius,
          borderWidth: CHART_DEFAULTS.lineWidth,
        },
      ],
      });
    },
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
          ...buildLegendOptions(themeColors),
        },
        tooltip: {
          ...buildTooltipOptions(themeColors),
          callbacks: {
            label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
              return `${context.dataset.label || ''}: ${context.parsed.y ?? 0} Mbps`;
            },
            afterBody: (items: { dataIndex: number }[]) => {
              if (!items.length) return [];
              const idx = items[0].dataIndex;
              const point = data[idx];
              if (!point) return [];
              const lines: string[] = [];
              if (point.networkType) lines.push(`网络制式: ${point.networkType}`);
              if (point.band) lines.push(`频段: ${point.band}`);
              if (point.connectedDevices != null) lines.push(`在线设备: ${point.connectedDevices}`);
              return lines;
            },
          },
        },
        zoom: {
          pan: {
            enabled: true,
            mode: 'x' as const,
          },
          zoom: {
            drag: {
              enabled: true,
              backgroundColor: `color-mix(in oklch, ${themeColors.primary} 15%, transparent)`,
            },
            mode: 'x' as const,
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
            text: '平均速率 (Mbps)',
            color: themeColors.muted,
          },
        },
      },
    }),
    [themeColors, data],
  );

  return <Line data={chartData} options={options} />;
}

export default TrafficChart;
