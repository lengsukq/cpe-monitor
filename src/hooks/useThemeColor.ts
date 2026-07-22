'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import {
  DEFAULT_HUE,
  applyThemeHue,
  findPreset,
  normalizeHue,
  readStoredHue,
  storeHue,
  type ThemePreset,
} from '@/lib/theme-colors';

export interface UseThemeColorResult {
  /** Current brand hue (0-360). */
  hue: number;
  /** Set a new hue — applies immediately and persists. */
  setHue: (hue: number) => void;
  /** Matching preset, if the hue equals one. */
  preset: ThemePreset | undefined;
  /** Whether the hue is the default (201). */
  isDefault: boolean;
  /** Reset to the default hue. */
  reset: () => void;
}

// Lightweight external store so every hook instance shares the same hue
// and updates propagate without setState-in-effect.
let cachedHue: number | null = null;
const hueListeners = new Set<() => void>();

function getHueSnapshot(): number {
  if (cachedHue === null) {
    cachedHue = readStoredHue();
  }
  return cachedHue;
}

function getHueServerSnapshot(): number {
  return DEFAULT_HUE;
}

function subscribeHue(listener: () => void): () => void {
  hueListeners.add(listener);
  return () => hueListeners.delete(listener);
}

function publishHue(hue: number): void {
  cachedHue = hue;
  hueListeners.forEach((listener) => listener());
}

export function useThemeColor(): UseThemeColorResult {
  const { resolvedTheme } = useTheme();
  const hue = useSyncExternalStore(subscribeHue, getHueSnapshot, getHueServerSnapshot);

  // Re-apply whenever hue or dark/light mode changes.
  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    applyThemeHue(hue, isDark);
  }, [hue, resolvedTheme]);

  const setHue = useCallback((next: number) => {
    const normalized = normalizeHue(next);
    storeHue(normalized);
    publishHue(normalized);
  }, []);

  const reset = useCallback(() => {
    storeHue(DEFAULT_HUE);
    publishHue(DEFAULT_HUE);
  }, []);

  return {
    hue,
    setHue,
    preset: findPreset(hue),
    isDefault: hue === DEFAULT_HUE,
    reset,
  };
}
