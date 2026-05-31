'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Smartphone, Bell, FileText, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/device', label: '设备', icon: Smartphone },
  { href: '/alerts', label: '告警', icon: Bell },
  { href: '/reports', label: '报告', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-xl bg-background/70 border-b border-border">
      <div className="h-full max-w-screen-2xl mx-auto px-4 lg:px-8 flex items-center justify-between">
        {/* Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            CPEye
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/api/auth/logout"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">退出</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
