'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatLocalTime } from '@/lib/format';

interface RefreshIndicatorProps {
  sseStatus: 'connecting' | 'connected' | 'disconnected';
  lastRefreshAt: Date | null;
  /** Polling interval in ms (used for countdown when SSE is disconnected). */
  pollIntervalMs?: number;
  className?: string;
}

/**
 * Shows real-time status:
 * - SSE connected: "实时" badge + last event time
 * - SSE disconnected: countdown to next poll
 */
export function RefreshIndicator({
  sseStatus,
  lastRefreshAt,
  pollIntervalMs = 15_000,
  className,
}: RefreshIndicatorProps) {
  const [countdown, setCountdown] = useState(Math.round(pollIntervalMs / 1000));

  useEffect(() => {
    if (sseStatus === 'connected') return;

    // Reset countdown on refresh
    setCountdown(Math.round(pollIntervalMs / 1000));
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? Math.round(pollIntervalMs / 1000) : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [sseStatus, lastRefreshAt, pollIntervalMs]);

  if (sseStatus === 'connected') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="font-medium text-success">实时</span>
        {lastRefreshAt && (
          <span className="text-muted-foreground/70">
            {formatLocalTime(lastRefreshAt)}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span className={cn(
        'inline-block h-2 w-2 rounded-full',
        sseStatus === 'connecting' ? 'bg-warning animate-pulse' : 'bg-muted-foreground/40',
      )} />
      {lastRefreshAt && (
        <span>更新于 {formatLocalTime(lastRefreshAt)}</span>
      )}
      <span className="tabular-nums text-muted-foreground/70">
        下次刷新 {countdown}s
      </span>
    </span>
  );
}
