'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Palette,
  RadioTower,
  Settings,
  Smartphone,
  X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useThemeColor } from '@/hooks/useThemeColor';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const paletteBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || toggleRef.current?.contains(target)) return;
      setMenuOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!paletteOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setPaletteOpen(false);
    }
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (paletteRef.current?.contains(target) || paletteBtnRef.current?.contains(target)) return;
      setPaletteOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [paletteOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:px-5 lg:px-7">
      <div className="glass relative mx-auto flex h-[76px] max-w-screen-2xl items-center justify-between rounded-3xl px-3 shadow-card sm:px-5">
        <Link
          href="/dashboard"
          className="group flex min-w-0 items-center gap-3 rounded-2xl pr-2 transition-opacity hover:opacity-80"
          onClick={() => setMenuOpen(false)}
        >
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-lg shadow-brand/20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
            <RadioTower className="h-5 w-5" aria-hidden />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-lg font-extrabold tracking-tight">CPEye</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Network Console</span>
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
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen ? (
            <motion.nav
              ref={menuRef}
              id="mobile-navigation"
              initial={reduce ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute inset-x-0 top-[calc(100%+.65rem)] origin-top rounded-3xl border border-white/80 bg-card p-3 shadow-2xl dark:border-border lg:hidden"
              aria-label="移动导航"
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {navItems.map((item, index) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={reduce ? undefined : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.03 + index * 0.035, duration: 0.22 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors',
                          isActive ? 'bg-foreground text-background' : 'bg-muted/45 text-foreground hover:bg-muted',
                        )}
                      >
                        <span className={cn('inline-flex size-9 items-center justify-center rounded-xl', isActive ? 'bg-background/15' : item.tone)}>
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
                <Link
                  href="/api/auth/logout"
                  className="flex items-center gap-3 rounded-2xl bg-danger/10 px-3 py-3 text-sm font-semibold text-danger sm:hidden"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-danger/10">
                    <LogOut className="h-4 w-4" />
                  </span>
                  退出登录
                </Link>
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}

export default TopNav;
