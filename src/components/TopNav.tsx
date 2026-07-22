'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  RadioTower,
  Settings,
  Smartphone,
  X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

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

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:px-5 lg:px-7">
      <div className="glass relative mx-auto flex h-[76px] max-w-screen-2xl items-center justify-between rounded-3xl px-3 shadow-card sm:px-5">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-3 rounded-2xl pr-2 transition-opacity hover:opacity-80"
          onClick={() => setMenuOpen(false)}
        >
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-lg shadow-brand/20">
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
                  'group flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                )}
              >
                <span className={cn(
                  'inline-flex size-8 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                  isActive ? 'bg-background/15 text-background' : item.tone,
                )}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5">
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

        {menuOpen ? (
          <nav
            ref={menuRef}
            id="mobile-navigation"
            className="animate-in slide-in-from-top-2 fade-in-0 absolute inset-x-0 top-[calc(100%+.65rem)] rounded-3xl border border-white/80 bg-card p-3 shadow-2xl duration-200 dark:border-border lg:hidden"
            aria-label="移动导航"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
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
          </nav>
        ) : null}
      </div>
    </header>
  );
}

export default TopNav;
