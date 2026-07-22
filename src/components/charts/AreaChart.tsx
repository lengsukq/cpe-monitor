'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
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
import {
  useChartTheme,
  buildTooltipOptions,
  buildScaleOptions,
  CHART_DEFAULTS,
} from '@/lib/chart-theme';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export interface AreaSeries {
  label: string;
  values: Array<number | null>;
  color?: string;
  /** Fill opacity percentage (0-100). Default 18. */
  fillAlpha?: number;
}

interface ThemedAreaChartProps {
  labels: string[];
  series: AreaSeries[];
  height?: number;
  showLegend?: boolean;
  yTitle?: string;
  formatValue?: (value: number) => string;
}

export function ThemedAreaChart({
  labels,
  series,
  height = 220,
  showLegend = false,
  yTitle,
  formatValue,
}: ThemedAreaChartProps) {
  const colors = useChartTheme();

  const data = useMemo(() => {
    const palette = [colors.primary, colors.secondary, colors.tertiary, colors.quaternary, colors.quinary];
    return {
      labels,
      datasets: series.map((item, index) => {
        const color = item.color || palette[index % palette.length];
        const alpha = item.fillAlpha ?? 18;
        return {
          label: item.label,
          data: item.values,
          borderColor: color,
          backgroundColor: `color-mix(in oklch, ${color} ${alpha}%, transparent)`,
          fill: true,
          tension: CHART_DEFAULTS.tension,
          pointRadius: 0,
          pointHoverRadius: CHART_DEFAULTS.pointHoverRadius,
          borderWidth: CHART_DEFAULTS.lineWidth,
        };
      }),
    };
  }, [labels, series, colors]);

  const options = useMemo(() => {
    const scales = buildScaleOptions(colors);
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' as const },
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: showLegend
          ? {
              position: 'top' as const,
              labels: {
                color: colors.muted,
                usePointStyle: true,
                pointStyle: 'circle' as const,
                boxWidth: 8,
                padding: 16,
              },
            }
          : { display: false },
        tooltip: {
          ...buildTooltipOptions(colors),
          ...(formatValue
            ? {
                callbacks: {
                  label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) =>
                    `${context.dataset.label || ''}: ${formatValue(context.parsed.y ?? 0)}`,
                },
              }
            : {}),
        },
      },
      scales: {
        ...scales,
        ...(yTitle
          ? { y: { ...scales.y, title: { display: true, text: yTitle, color: colors.muted } } }
          : {}),
      },
    };
  }, [colors, showLegend, yTitle, formatValue]);

  return (
    <div style={{ height }} className="relative w-full">
      <Line data={data} options={options} />
    </div>
  );
}

export default ThemedAreaChart;
