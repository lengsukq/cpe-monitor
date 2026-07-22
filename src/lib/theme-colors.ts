/**
 * Theme color system — hue-based oklch palette derivation.
 *
 * The app's design tokens are built around a single brand hue (default 201).
 * Users can rotate the hue; all brand-related CSS variables are re-derived
 * at runtime while semantic colors (success/warning/danger) stay fixed.
 */

export const DEFAULT_HUE = 201;
export const STORAGE_KEY = 'cpeye-theme-hue';

export interface ThemePreset {
  name: string;
  hue: number;
}

export const THEME_PRESETS: ThemePreset[] = [
  { name: '青蓝', hue: 201 },
  { name: '靛蓝', hue: 240 },
  { name: '紫罗兰', hue: 280 },
  { name: '品红', hue: 330 },
  { name: '珊瑚', hue: 25 },
  { name: '琥珀', hue: 75 },
  { name: '翡翠', hue: 150 },
  { name: '薄荷', hue: 170 },
  { name: '天蓝', hue: 220 },
  { name: '玫红', hue: 355 },
];

/** Normalize hue into [0, 360) */
export function normalizeHue(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

function h(base: number, offset: number): number {
  return normalizeHue(base + offset);
}

/**
 * Derive the full set of CSS custom property overrides for a given hue.
 * Lightness / chroma values mirror the defaults in globals.css — only hue rotates.
 */
export function derivePalette(hue: number, isDark: boolean): Record<string, string> {
  const hue2 = h(hue, -26); // secondary chart hue for depth
  const hueBg = h(hue, 4); // subtle background tint offset
  const hueFg = h(hue, 19); // foreground tint offset
  const hueBorder = h(hue, 9); // border tint offset

  if (!isDark) {
    return {
      '--primary': `oklch(0.5 0.16 ${hue})`,
      '--primary-foreground': `oklch(0.985 0.01 ${hue})`,
      '--brand': `oklch(0.6 0.14 ${hue})`,
      '--ring': `oklch(0.62 0.1 ${hue})`,
      '--chart-1': `oklch(0.6 0.15 ${hue})`,
      '--chart-2': `oklch(0.6 0.13 ${hue2})`,
      '--background': `oklch(0.972 0.018 ${hueBg})`,
      '--foreground': `oklch(0.2 0.015 ${hueFg})`,
      '--border': `oklch(0.91 0.012 ${hueBorder})`,
      '--input': `oklch(0.91 0.012 ${hueBorder})`,
      '--surface-hero': `oklch(0.28 0.05 ${hue})`,
      '--surface-hero-foreground': `oklch(0.98 0.01 ${hue})`,
      '--shadow-card': `0 18px 50px -32px color-mix(in oklch, var(--brand) 42%, transparent), 0 2px 10px -6px color-mix(in oklch, var(--foreground) 15%, transparent)`,
    };
  }

  return {
    '--primary': `oklch(0.72 0.14 ${hue})`,
    '--primary-foreground': `oklch(0.16 0.03 ${hue})`,
    '--brand': `oklch(0.72 0.14 ${hue})`,
    '--ring': `oklch(0.62 0.12 ${hue})`,
    '--chart-1': `oklch(0.72 0.14 ${hue})`,
    '--chart-2': `oklch(0.7 0.13 ${hue2})`,
    '--background': `oklch(0.15 0.012 ${hueBg})`,
    '--foreground': `oklch(0.95 0.008 ${hueFg})`,
    '--border': `oklch(1 0 0 / 10%)`,
    '--input': `oklch(1 0 0 / 12%)`,
    '--surface-hero': `oklch(0.24 0.045 ${hue})`,
    '--surface-hero-foreground': `oklch(0.97 0.01 ${hue})`,
    '--shadow-card': `0 12px 32px -20px color-mix(in oklch, black 55%, transparent)`,
  };
}

/** All CSS variable names managed by the theme system (for cleanup). */
export const THEME_VARIABLE_NAMES = [
  '--primary',
  '--primary-foreground',
  '--brand',
  '--ring',
  '--chart-1',
  '--chart-2',
  '--background',
  '--foreground',
  '--border',
  '--input',
  '--surface-hero',
  '--surface-hero-foreground',
  '--shadow-card',
] as const;

/**
 * Apply a hue to the document root. Pass DEFAULT_HUE to reset to stylesheet defaults.
 */
export function applyThemeHue(hue: number, isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (hue === DEFAULT_HUE) {
    for (const name of THEME_VARIABLE_NAMES) {
      root.style.removeProperty(name);
    }
    return;
  }

  const palette = derivePalette(hue, isDark);
  for (const [name, value] of Object.entries(palette)) {
    root.style.setProperty(name, value);
  }
}

/** Read persisted hue from localStorage (SSR-safe). */
export function readStoredHue(): number {
  if (typeof window === 'undefined') return DEFAULT_HUE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_HUE;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? normalizeHue(parsed) : DEFAULT_HUE;
  } catch {
    return DEFAULT_HUE;
  }
}

/** Persist hue to localStorage (SSR-safe). */
export function storeHue(hue: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (hue === DEFAULT_HUE) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, String(normalizeHue(hue)));
    }
  } catch {
    // storage unavailable — ignore
  }
}

/** Find the preset matching a hue, if any. */
export function findPreset(hue: number): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.hue === normalizeHue(hue));
}

/** CSS gradient string for the hue slider track. */
export const HUE_SLIDER_GRADIENT = `linear-gradient(to right, ${Array.from(
  { length: 13 },
  (_, i) => `oklch(0.6 0.16 ${i * 30})`,
).join(', ')})`;
