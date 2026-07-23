'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Bell,
  Palette,
  RadioTower,
  Settings,
  Smartphone,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useDismissable } from '@/hooks/useDismissable';
import { THEME_PRESETS } from '@/lib/theme-colors';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard, tone: 'text-brand bg-brand/10' },
  { href: '/device', label: '设备', icon: Smartphone, tone: 'text-info bg-info/10' },
  { href: '/sms', label: '短信', icon: MessageSquareText, tone: 'text-success bg-success/10' },
  { href: '/alerts', label: '告警', icon: Bell, tone: 'text-warning bg-warning/10' },
  { href: '/reports', label: '报告', icon: FileText, tone: 'text-violet-600 bg-violet-500/10 dark:text-violet-300' },
  { href: '/settings', label: '设置', icon: Settings, tone: 'text-slate-600 bg-slate-500/10 dark:text-slate-300' },
];

export function TopNav() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { hue, setHue } = useThemeColor();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const paletteBtnRef = useRef<HTMLButtonElement | null>(null);

  useDismissable(paletteOpen, setPaletteOpen, [paletteRef, paletteBtnRef]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(.5rem,env(safe-area-inset-top))] sm:px-5 lg:px-7 lg:pt-[max(.75rem,env(safe-area-inset-top))]">
      <div className="glass relative mx-auto flex h-14 max-w-screen-2xl items-center justify-between rounded-2xl px-3 shadow-card sm:px-5 lg:h-[76px] lg:rounded-3xl">
        <Link
          href="/dashboard"
          className="group flex min-w-0 items-center gap-2.5 rounded-2xl pr-2 transition-opacity hover:opacity-80 lg:gap-3"
        >
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-primary-foreground shadow-lg shadow-brand/20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105 lg:size-11 lg:rounded-2xl">
            <RadioTower className="h-4 w-4 lg:h-5 lg:w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-extrabold tracking-tight lg:text-lg">CPEye</span>
            <span className="hidden text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground lg:block">Network Console</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-colors duration-200',
                  isActive
                    ? 'text-background'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                {isActive ? (
                  <motion.span
                    layoutId={reduce ? undefined : 'nav-active-indicator'}
                    className="absolute inset-0 rounded-2xl bg-foreground shadow-sm"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    aria-hidden
                  />
                ) : null}
                <span className={cn(
                  'relative inline-flex size-8 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                  isActive ? 'bg-background/15 text-background' : item.tone,
                )}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <div className="relative">
            <button
              ref={paletteBtnRef}
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="切换主题色"
              title="切换主题色"
              aria-expanded={paletteOpen}
              onClick={() => setPaletteOpen((open) => !open)}
            >
              <Palette className="h-4 w-4" aria-hidden />
            </button>
            <AnimatePresence>
              {paletteOpen ? (
                <motion.div
                  ref={paletteRef}
                  initial={reduce ? undefined : { opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="absolute right-0 top-[calc(100%+.6rem)] w-56 origin-top-right rounded-2xl border border-border/70 bg-card p-3 shadow-2xl"
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    主题色快捷切换
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {THEME_PRESETS.map((preset) => {
                      const active = preset.hue === hue;
                      return (
                        <button
                          key={preset.hue}
                          type="button"
                          title={preset.name}
                          aria-label={`主题色 ${preset.name}`}
                          onClick={() => setHue(preset.hue)}
                          className={cn(
                            'size-8 rounded-full transition-transform hover:scale-110',
                            active && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
                          )}
                          style={{ background: `oklch(0.62 0.16 ${preset.hue})` }}
                        />
                      );
                    })}
                  </div>
                  <Link
                    href="/settings#theme-color"
                    onClick={() => setPaletteOpen(false)}
                    className="mt-2.5 block rounded-xl px-2 py-1.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    自定义主题色 →
                  </Link>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <ThemeToggle />
          <Link
            href="/api/auth/logout"
            className="hidden size-10 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger sm:inline-flex"
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
