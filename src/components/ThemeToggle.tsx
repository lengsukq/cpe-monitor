'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

const THEME_CYCLE: Array<{ value: string; label: string }> = [
  { value: 'light', label: '浅色模式' },
  { value: 'dark', label: '深色模式' },
  { value: 'system', label: '跟随系统' },
];

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="size-10 sm:size-9">
        <div className="h-4 w-4" />
      </Button>
    );
  }

  const currentIndex = THEME_CYCLE.findIndex((t) => t.value === (theme || 'system'));
  const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
  const next = THEME_CYCLE[nextIndex];
  const activeTheme = theme || 'system';

  const icon = activeTheme === 'dark'
    ? <Moon className="h-4 w-4" />
    : activeTheme === 'light'
      ? <Sun className="h-4 w-4" />
      : <Monitor className="h-4 w-4" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10 sm:size-9"
      aria-label={`当前：${THEME_CYCLE[currentIndex]?.label || '跟随系统'}，点击切换到${next.label}`}
      title={`切换到${next.label}`}
      onClick={() => setTheme(next.value)}
    >
      {icon}
    </Button>
  );
}
