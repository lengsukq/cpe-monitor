'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { STORAGE_KEY } from '@/lib/theme-colors';

export interface ChartThemeColors {
  /** Primary chart series color (brand hue). */
  primary: string;
  /** Secondary chart series color (hue offset). */
  secondary: string;
  /** Third series color — warm accent. */
  tertiary: string;
  /** Fourth series color — violet accent. */
  quaternary: string;
  /** Fifth series color — green accent. */
  quinary: string;
  muted: string;
  border: string;
  card: string;
  foreground: string;
  success: string;
  warning: string;
  danger: string;
}

export function readCssColor(variableName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  return value || fallback;
}

export function readChartTheme(): ChartThemeColors {
  return {
    primary: readCssColor('--chart-1', 'oklch(0.6 0.15 201)'),
    secondary: readCssColor('--chart-2', 'oklch(0.6 0.13 175)'),
    tertiary: readCssColor('--chart-3', 'oklch(0.72 0.16 75)'),
    quaternary: readCssColor('--chart-4', 'oklch(0.62 0.16 300)'),
    quinary: readCssColor('--chart-5', 'oklch(0.6 0.14 150)'),
    muted: readCssColor('--muted-foreground', 'oklch(0.5 0 0)'),
    border: readCssColor('--border', 'oklch(0.9 0 0)'),
    card: readCssColor('--card', 'oklch(1 0 0)'),
    foreground: readCssColor('--foreground', 'oklch(0.15 0 0)'),
    success: readCssColor('--success', 'oklch(0.55 0.16 150)'),
    warning: readCssColor('--warning', 'oklch(0.74 0.16 75)'),
    danger: readCssColor('--danger', 'oklch(0.58 0.22 25)'),
  };
}

/**
 * Reactive chart theme hook — re-reads CSS variables when:
 * 1. Dark/light mode changes (next-themes resolvedTheme)
 * 2. Custom brand hue changes (localStorage cpeye-theme-hue)
 */
export function useChartTheme(): ChartThemeColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartThemeColors>(() => readChartTheme());

  // Re-read on dark/light switch.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setColors(readChartTheme());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [resolvedTheme]);

  // Re-read on custom hue change (storage event covers same-tab writes too
  // because applyThemeHue mutates the root style before this fires).
  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) {
        setColors(readChartTheme());
      }
    }
    window.addEventListener('storage', handleStorage);

    // Also observe root style attribute mutations (same-tab hue changes).
    const observer = new MutationObserver(() => {
      setColors(readChartTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => {
      window.removeEventListener('storage', handleStorage);
      observer.disconnect();
    };
  }, []);

  return colors;
}

/* ─── Shared chart option builders ────────────────────────────────── */

export const CHART_DEFAULTS = {
  lineWidth: 2,
  pointHoverRadius: 4,
  tension: 0.4,
  borderRadius: 6,
} as const;

export function buildTooltipOptions(colors: ChartThemeColors) {
  return {
    backgroundColor: colors.card,
    titleColor: colors.foreground,
    bodyColor: colors.foreground,
    borderColor: colors.border,
    borderWidth: 1,
    cornerRadius: 10,
    padding: 10,
    titleFont: { weight: 600 as const },
  };
}

export function buildLegendOptions(colors: ChartThemeColors) {
  return {
    labels: {
      color: colors.muted,
      usePointStyle: true,
      pointStyle: 'circle' as const,
      boxWidth: 8,
      padding: 16,
    },
  };
}

export function buildScaleOptions(colors: ChartThemeColors) {
  const gridColor = `color-mix(in oklch, ${colors.border} 70%, transparent)`;
  return {
    x: {
      grid: { color: gridColor },
      ticks: { color: colors.muted, maxRotation: 0 },
      border: { display: false },
    },
    y: {
      beginAtZero: true,
      grid: { color: gridColor },
      ticks: { color: colors.muted },
      border: { display: false },
    },
  };
}

/** Create a vertical gradient fill for bar/area charts. */
export function createGradient(
  ctx: CanvasRenderingContext2D,
  area: { top: number; bottom: number },
  color: string,
  topAlpha = 65,
  bottomAlpha = 8,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
  gradient.addColorStop(0, `color-mix(in oklch, ${color} ${topAlpha}%, transparent)`);
  gradient.addColorStop(1, `color-mix(in oklch, ${color} ${bottomAlpha}%, transparent)`);
  return gradient;
}
