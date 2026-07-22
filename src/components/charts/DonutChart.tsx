'use client';

import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useChartTheme, buildTooltipOptions } from '@/lib/chart-theme';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Text rendered in the donut center (via plugin). */
  centerLabel?: string;
  centerSub?: string;
  height?: number;
  showLegend?: boolean;
  cutout?: string;
}

const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart: ChartJS<'doughnut'>) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    const { x, y } = meta.data[0];
    const options = chart.options as { plugins?: { centerText?: { label?: string; sub?: string } } };
    const config = options.plugins?.centerText;
    if (!config?.label) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 1.25rem system-ui, sans-serif';
    ctx.fillStyle = getComputedStyle(chart.canvas).getPropertyValue('color') || '#333';
    ctx.fillText(config.label, x, config.sub ? y - 9 : y);
    if (config.sub) {
      ctx.font = '0.7rem system-ui, sans-serif';
      ctx.globalAlpha = 0.6;
      ctx.fillText(config.sub, x, y + 13);
    }
    ctx.restore();
  },
};

export function DonutChart({
  segments,
  centerLabel,
  centerSub,
  height = 200,
  showLegend = true,
  cutout = '72%',
}: DonutChartProps) {
  const colors = useChartTheme();

  const data = useMemo(() => {
    const palette = [colors.primary, colors.secondary, colors.tertiary, colors.quaternary, colors.quinary, colors.success, colors.warning];
    return {
      labels: segments.map((segment) => segment.label),
      datasets: [
        {
          data: segments.map((segment) => segment.value),
          backgroundColor: segments.map((segment, index) =>
            segment.color || `color-mix(in oklch, ${palette[index % palette.length]} 78%, transparent)`),
          borderColor: colors.card,
          borderWidth: 3,
          hoverOffset: 6,
          borderRadius: 4,
        },
      ],
    };
  }, [segments, colors]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout,
    animation: { animateRotate: true, duration: 800 },
    plugins: {
      legend: showLegend
        ? {
            position: 'bottom' as const,
            labels: {
              color: colors.muted,
              usePointStyle: true,
              pointStyle: 'circle' as const,
              boxWidth: 8,
              padding: 14,
              font: { size: 11 },
            },
          }
        : { display: false },
      tooltip: buildTooltipOptions(colors),
      centerText: { label: centerLabel, sub: centerSub },
    },
  }), [colors, showLegend, centerLabel, centerSub, cutout]);

  return (
    <div style={{ height }} className="relative w-full">
      <Doughnut
        data={data}
        options={options}
        plugins={[centerTextPlugin]}
      />
    </div>
  );
}

export default DonutChart;
