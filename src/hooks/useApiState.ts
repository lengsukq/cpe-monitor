'use client';

import { useCallback, useRef, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

export interface ApiState<T> {
  data: T | null;
  error: string;
  loading: boolean;
  fetch: (init?: RequestInit) => Promise<T | null>;
}

/**
 * Generic hook for managing API fetch state (data, error, loading).
 * Reduces boilerplate for simple fetch-and-set-state patterns.
 */
export function useApiState<T>(url: string, fallbackError = '请求失败'): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (init?: RequestInit): Promise<T | null> => {
    try {
      const result = await apiFetch<T>(url, init, fallbackError);
      if (mountedRef.current) {
        setData(result);
        setError('');
      }
      return result;
    } catch (err) {
      console.error(err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : fallbackError);
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, fallbackError]);

  return { data, error, loading, fetch: fetchData };
}
