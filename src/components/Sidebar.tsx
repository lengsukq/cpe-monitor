'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: '仪表盘', icon: '📊' },
  { href: '/settings', label: '设置', icon: '⚙️' },
  { href: '/alerts', label: '告警规则', icon: '🔔' },
  { href: '/alerts/logs', label: '告警日志', icon: '📋' },
  { href: '/reports', label: '每日报告', icon: '📈' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">CPEye</h1>
        <p className="text-gray-400 text-sm">5G CPE 流量监控</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 pt-4 border-t border-gray-700">
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white transition-colors"
        >
          <span>🚪</span>
          <span>退出登录</span>
        </Link>
      </div>
    </aside>
  );
}
