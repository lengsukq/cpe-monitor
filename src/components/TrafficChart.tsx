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
  Filler
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

export default function TrafficChart({ data }: TrafficChartProps) {
  // The API stores byte counters. Keep the chart numeric and use one fixed
  // unit so the y-axis and tooltip always describe the plotted values.
  const toMegabytes = (bytes: number | null) => Number(((bytes || 0) / 1024 / 1024).toFixed(2));

  const chartData = {
    labels: data.map((d) => {
      const date = new Date(`${d.timestamp.replace(' ', 'T')}Z`);
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai',
      });
    }),
    datasets: [
      {
        label: '下载',
        data: data.map((d) => toMegabytes(d.downloadBytes)),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: '上传',
        data: data.map((d) => toMegabytes(d.uploadBytes)),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
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
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '流量 (MB)',
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}
