'use client';

import type { ReactNode } from 'react';
import { useThemeColor } from '@/hooks/useThemeColor';

/**
 * Applies the persisted brand hue to the document root on mount and keeps it
 * in sync with dark/light mode changes. Render inside next-themes' ThemeProvider.
 */
export function ThemeColorProvider({ children }: { children: ReactNode }) {
  useThemeColor();
  return <>{children}</>;
}
