'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { withBasePath } from '@/lib/base-path';

export interface SSEEvent {
  type: 'metrics' | 'alert' | 'collection' | 'connection';
  payload: Record<string, unknown>;
  timestamp: string;
}

type SSEStatus = 'connecting' | 'connected' | 'disconnected';

interface UseSSEOptions {
  /** Called on every SSE event. */
  onEvent?: (event: SSEEvent) => void;
  /** Whether the SSE connection is enabled. Defaults to true. */
  enabled?: boolean;
}

interface UseSSEResult {
  status: SSEStatus;
  lastEvent: SSEEvent | null;
  /** Manually reconnect. */
  reconnect: () => void;
}

const MAX_RETRY_DELAY = 30_000;
const BASE_RETRY_DELAY = 2_000;

export function useSSE({ onEvent, enabled = true }: UseSSEOptions = {}): UseSSEResult {
  const [status, setStatus] = useState<SSEStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  const connectRef = useRef<() => void>(() => {});

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    const es = new EventSource(withBasePath('/api/dashboard/stream'));
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus('connected');
      retryCountRef.current = 0;
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;
        setLastEvent(data);
        onEventRef.current?.(data);
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setStatus('disconnected');

      // Exponential backoff retry
      const delay = Math.min(
        BASE_RETRY_DELAY * 2 ** retryCountRef.current,
        MAX_RETRY_DELAY,
      );
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        connectRef.current();
      }, delay);
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const reconnect = useCallback(() => {
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    connect();
  }, [connect]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const initTimer = setTimeout(() => {
      connect();
    }, 0);

    return () => {
      clearTimeout(initTimer);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [enabled, connect]);

  return { status: enabled ? status : 'disconnected', lastEvent, reconnect };
}
