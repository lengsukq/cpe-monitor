'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UseKeyboardShortcutsOptions {
  onOpenPalette?: () => void;
  onRefresh?: () => void;
}

const PAGE_MAP: Record<string, string> = {
  '1': '/dashboard',
  '2': '/device',
  '3': '/sms',
  '4': '/alerts',
  '5': '/reports',
  '6': '/settings',
};

/**
 * Global keyboard shortcuts:
 * - Cmd/Ctrl+K: open command palette
 * - 1-6: navigate to pages
 * - R: refresh current page data
 */
export function useKeyboardShortcuts({ onOpenPalette, onRefresh }: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore when typing in inputs
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

    // Cmd/Ctrl+K: command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      onOpenPalette?.();
      return;
    }

    if (isInput) return;

    // Number keys 1-6: navigate
    if (PAGE_MAP[e.key] && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      router.push(PAGE_MAP[e.key]);
      return;
    }

    // R: refresh
    if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      onRefresh?.();
    }
  }, [onOpenPalette, onRefresh, router]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
