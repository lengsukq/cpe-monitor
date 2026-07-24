'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSSE, type SSEEvent } from '@/hooks/useSSE';

const LAST_SEEN_KEY = 'cpeye-alerts-last-seen';

interface UseAlertNotificationResult {
  unreadCount: number;
  markAsRead: () => void;
  sseStatus: 'connecting' | 'connected' | 'disconnected';
}

/**
 * Global alert notification hook.
 * - Listens to SSE alert events and shows toast notifications.
 * - Tracks unread alert count based on alerts since last visit to alerts page.
 */
export function useAlertNotification(): UseAlertNotificationResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenRef = useRef<string | null>(null);

  // Load last-seen timestamp from localStorage
  useEffect(() => {
    try {
      lastSeenRef.current = localStorage.getItem(LAST_SEEN_KEY);
    } catch { /* ignore */ }
    void fetchUnreadCount();
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const since = lastSeenRef.current;
      const url = since
        ? `/api/alerts/unread-count?since=${encodeURIComponent(since)}`
        : '/api/alerts/unread-count';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch { /* ignore */ }
  }, []);

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'alert') {
      const message = (event.payload.message as string) || '新告警触发';
      const ruleName = (event.payload.ruleName as string) || '';
      toast.warning(ruleName ? `${ruleName}: ${message}` : message, {
        description: new Date(event.timestamp).toLocaleString('zh-CN'),
      });
      // Increment unread count
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const { status: sseStatus } = useSSE({ onEvent: handleSSEEvent });

  const markAsRead = useCallback(() => {
    const now = new Date().toISOString();
    lastSeenRef.current = now;
    try {
      localStorage.setItem(LAST_SEEN_KEY, now);
    } catch { /* ignore */ }
    setUnreadCount(0);
  }, []);

  return { unreadCount, markAsRead, sseStatus };
}
