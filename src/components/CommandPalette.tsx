'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  FileText,
  LayoutDashboard,
  MessageSquareText,
  Search,
  Settings,
  Smartphone,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CommandItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  shortcut?: string;
  keywords?: string;
}

const COMMANDS: CommandItem[] = [
  { label: '仪表盘', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, shortcut: '1', keywords: 'dashboard home' },
  { label: '设备', href: '/device', icon: <Smartphone className="h-4 w-4" />, shortcut: '2', keywords: 'device terminal' },
  { label: '短信', href: '/sms', icon: <MessageSquareText className="h-4 w-4" />, shortcut: '3', keywords: 'sms message' },
  { label: '告警', href: '/alerts', icon: <Bell className="h-4 w-4" />, shortcut: '4', keywords: 'alert warning' },
  { label: '报告', href: '/reports', icon: <FileText className="h-4 w-4" />, shortcut: '5', keywords: 'report daily weekly' },
  { label: '设置', href: '/settings', icon: <Settings className="h-4 w-4" />, shortcut: '6', keywords: 'settings config' },
  { label: '告警历史', href: '/alerts/history', icon: <Bell className="h-4 w-4" />, keywords: 'alert history log' },
  { label: '系统日志', href: '/settings/logs', icon: <FileText className="h-4 w-4" />, keywords: 'system log' },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter((cmd) =>
      cmd.label.toLowerCase().includes(q) || (cmd.keywords || '').toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const navigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[activeIndex]) {
      e.preventDefault();
      navigate(filtered[activeIndex].href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>快速导航</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面…"
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">无匹配结果</p>
          ) : (
            filtered.map((cmd, index) => (
              <button
                key={cmd.href}
                type="button"
                onClick={() => navigate(cmd.href)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                  index === activeIndex ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50',
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                  {cmd.icon}
                </span>
                <span className="flex-1 font-medium">{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          ↑↓ 导航 · Enter 跳转 · 1-6 快速切换 · R 刷新
        </div>
      </DialogContent>
    </Dialog>
  );
}
