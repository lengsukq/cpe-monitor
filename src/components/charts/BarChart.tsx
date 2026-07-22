'use client';

import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  useChartTheme,
  buildTooltipOptions,
  buildScaleOptions,
  CHART_DEFAULTS,
} from '@/lib/chart-theme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface BarSeries {
  label: string;
  values: Array<number | null>;
  color?: string;
}

interface ThemedBarChartProps {
  labels: string[];
  series: BarSeries[];
  height?: number;
  showLegend?: boolean;
  /** Stacked bars when multiple series. */
  stacked?: boolean;
  /** Y-axis title. */
  yTitle?: string;
  /** Custom tooltip value formatter. */
  formatValue?: (value: number) => string;
  horizontal?: boolean;
}

export function ThemedBarChart({
  labels,
  series,
  height = 220,
  showLegend = false,
  stacked = false,
  yTitle,
  formatValue,
  horizontal = false,
}: ThemedBarChartProps) {
  const colors = useChartTheme();

  const data = useMemo(() => {
    const palette = [colors.primary, colors.secondary, colors.tertiary, colors.quaternary, colors.quinary];
    return {
      labels,
      datasets: series.map((item, index) => {
        const color = item.color || palette[index % palette.length];
        return {
          label: item.label,
          data: item.values,
          backgroundColor: `color-mix(in oklch, ${color} 72%, transparent)`,
          hoverBackgroundColor: `color-mix(in oklch, ${color} 90%, transparent)`,
          borderColor: color,
          borderWidth: 1,
          borderRadius: CHART_DEFAULTS.borderRadius,
          borderSkipped: false as const,
          maxBarThickness: 36,
        };
      }),
    };
  }, [labels, series, colors]);

  const options = useMemo(() => {
    const scales = buildScaleOptions(colors);
    const base = {
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
                  label: (context: { dataset: { label?: string }; parsed: { y: number | null; x: number | null } }) => {
                    const raw = horizontal ? context.parsed.x : context.parsed.y;
                    return `${context.dataset.label || ''}: ${formatValue(raw ?? 0)}`;
                  },
                },
              }
            : {}),
        },
      },
    };

    if (horizontal) {
      return {
        ...base,
        indexAxis: 'y' as const,
        scales: {
          x: { ...scales.y, stacked },
          y: { ...scales.x, stacked },
        },
      };
    }

    return {
      ...base,
      scales: {
        x: { ...scales.x, stacked },
        y: {
          ...scales.y,
          stacked,
          ...(yTitle ? { title: { display: true, text: yTitle, color: colors.muted } } : {}),
        },
      },
    };
  }, [colors, showLegend, stacked, yTitle, formatValue, horizontal]);

  return (
    <div style={{ height }} className="relative w-full">
      <Bar data={data} options={options} />
    </div>
  );
}

export default ThemedBarChart;
