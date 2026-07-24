'use client';

import { useCallback, useState } from 'react';
import { Reorder } from 'framer-motion';
import { Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DashboardCardConfig {
  id: string;
  label: string;
  visible: boolean;
}

const STORAGE_KEY = 'cpeye-dashboard-layout';

const DEFAULT_CARDS: DashboardCardConfig[] = [
  { id: 'status-pills', label: '状态指标', visible: true },
  { id: 'traffic-trend', label: '流量趋势', visible: true },
  { id: 'network-history', label: '信号/设备趋势', visible: true },
  { id: 'traffic-compare', label: '流量对比', visible: true },
  { id: 'cell-snapshot', label: '小区信息', visible: true },
  { id: 'traffic-stats', label: '流量统计', visible: true },
  { id: 'quick-links', label: '快捷入口', visible: true },
];

function loadLayout(): DashboardCardConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DashboardCardConfig[];
      // Merge with defaults to handle new cards
      const storedIds = new Set(parsed.map((c) => c.id));
      const newCards = DEFAULT_CARDS.filter((c) => !storedIds.has(c.id));
      return [...parsed, ...newCards];
    }
  } catch { /* ignore */ }
  return DEFAULT_CARDS;
}

function saveLayout(cards: DashboardCardConfig[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch { /* ignore */ }
}

interface DashboardLayoutProps {
  children: Record<string, React.ReactNode>;
  className?: string;
}

/**
 * Customizable dashboard layout with drag-to-reorder and show/hide cards.
 * Configuration persisted to localStorage.
 */
export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  const [cards, setCards] = useState<DashboardCardConfig[]>(loadLayout);
  const [editing, setEditing] = useState(false);

  const handleReorder = useCallback((newOrder: DashboardCardConfig[]) => {
    setCards(newOrder);
    saveLayout(newOrder);
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setCards((prev) => {
      const updated = prev.map((c) => c.id === id ? { ...c, visible: !c.visible } : c);
      saveLayout(updated);
      return updated;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setCards(DEFAULT_CARDS);
    saveLayout(DEFAULT_CARDS);
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setEditing((prev) => !prev)}
        >
          {editing ? '完成' : '自定义布局'}
        </Button>
        {editing && (
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={resetLayout}>
            重置
          </Button>
        )}
      </div>

      {editing ? (
        <Reorder.Group axis="y" values={cards} onReorder={handleReorder} className="space-y-2">
          {cards.map((card) => (
            <Reorder.Item
              key={card.id}
              value={card}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm',
                !card.visible && 'opacity-50',
              )}
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{card.label}</span>
              <button
                type="button"
                onClick={() => toggleVisibility(card.id)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={card.visible ? '隐藏' : '显示'}
              >
                {card.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      ) : (
        cards.filter((c) => c.visible).map((card) => (
          <div key={card.id}>
            {children[card.id] || null}
          </div>
        ))
      )}
    </div>
  );
}
