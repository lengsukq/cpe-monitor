'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Bell,
  FileText,
  Settings,
  LogOut,
  Menu,
  MessageSquareText,
  X,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/device', label: '设备', icon: Smartphone },
  { href: '/sms', label: '短信', icon: MessageSquareText },
  { href: '/alerts', label: '告警', icon: Bell },
  { href: '/reports', label: '报告', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings },
];

export function TopNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (toggleRef.current?.contains(target)) return;
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
    <header className="glass fixed left-0 right-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)]">
      <div className="relative mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight text-foreground transition-colors duration-200 hover:text-brand"
            onClick={() => setMenuOpen(false)}
          >
            <span className="bg-gradient-to-r from-brand to-info bg-clip-text text-transparent">
              CPEye
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'bg-brand/10 text-brand shadow-sm ring-1 ring-brand/15'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link
            href="/api/auth/logout"
            className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground sm:h-9 sm:min-w-0 sm:justify-start"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">退出</span>
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground md:hidden"
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
            className="animate-in slide-in-from-top-2 fade-in-0 absolute left-0 right-0 top-full border-b border-border bg-background/95 p-3 shadow-xl backdrop-blur-xl duration-200 md:hidden"
            aria-label="移动导航"
          >
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-brand/10 text-brand ring-1 ring-brand/15'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}

export default TopNav;
