'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { UpdateStatusState } from '../types';

export function useSystemUpdate() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusState | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const fetchUpdateStatus = useCallback(async () => {
    try {
      setUpdateStatus(await apiFetch<UpdateStatusState>('/api/system/update', undefined, '无法获取升级状态'));
    } catch (error) {
      setUpdateStatus({ error: error instanceof Error ? error.message : '无法获取升级状态' });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchUpdateStatus(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchUpdateStatus]);

  const checkSystemUpdate = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      setUpdateStatus(await apiFetch<UpdateStatusState>('/api/system/update', { method: 'POST' }, '检查更新失败'));
    } catch (error) {
      setUpdateStatus({ error: error instanceof Error ? error.message : '检查更新请求失败' });
    } finally {
      setCheckingUpdate(false);
    }
  }, []);

  return { updateStatus, checkingUpdate, fetchUpdateStatus, checkSystemUpdate };
}
