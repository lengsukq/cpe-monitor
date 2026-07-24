'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Smartphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabItems = [
  { href: '/dashboard', label: '仪表盘', icon: LayoutDashboard },
  { href: '/device', label: '设备', icon: Smartphone },
  { href: '/sms', label: '短信', icon: MessageSquareText },
  { href: '/alerts', label: '告警', icon: Bell },
  { href: '/reports', label: '报告', icon: FileText },
  { href: '/settings', label: '设置', icon: Settings },
];

interface BottomTabBarProps {
  smsUnread?: number;
  alertUnread?: number;
}

export function BottomTabBar({ smsUnread = 0, alertUnread = 0 }: BottomTabBarProps) {
  const pathname = usePathname();

  const getBadge = (href: string): number => {
    if (href === '/sms') return smsUnread;
    if (href === '/alerts') return alertUnread;
    return 0;
  };

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-50 border-t border-white/60 pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-border"
      aria-label="底部导航"
    >
      <div className="mx-auto flex h-14 max-w-lg items-center justify-around">
        {tabItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition-colors',
                isActive
                  ? 'text-brand'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={cn(
                  'relative inline-flex size-7 items-center justify-center rounded-lg transition-colors',
                  isActive && 'bg-brand/10',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {getBadge(item.href) > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 text-[9px] font-bold text-white">
                    {getBadge(item.href) > 99 ? '99+' : getBadge(item.href)}
                  </span>
                )}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomTabBar;
