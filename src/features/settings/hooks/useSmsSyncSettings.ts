'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { SettingsActionContext, SmsSyncConfigForm } from '../types';

interface SmsSettingsResponse {
  enabled?: boolean;
  interval?: number;
  running?: boolean;
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

const DEFAULT_SMS: SmsSyncConfigForm = {
  enabled: true, interval: '15', running: false, lastSyncedAt: null, lastError: null,
};

function mapSmsConfig(data: SmsSettingsResponse, fallbackInterval = 15): SmsSyncConfigForm {
  return {
    enabled: Boolean(data.enabled),
    interval: String(data.interval || fallbackInterval),
    running: Boolean(data.running),
    lastSyncedAt: data.lastSyncedAt || null,
    lastError: data.lastError || null,
  };
}

export function useSmsSyncSettings(context: SettingsActionContext) {
  const [smsSyncConfig, setSmsSyncConfig] = useState<SmsSyncConfigForm>(DEFAULT_SMS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingSmsSync, setSavingSmsSync] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiFetch<SmsSettingsResponse>('/api/dashboard/sms/settings', undefined, '获取短信同步设置失败');
      setSmsSyncConfig(mapSmsConfig(data));
    } catch (error) {
      console.error('Failed to fetch SMS sync config:', error);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchConfig(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchConfig]);

  const saveSmsSyncConfig = useCallback(async () => {
    const interval = Number(smsSyncConfig.interval);
    if (!Number.isInteger(interval) || interval < 1 || interval > 1440) {
      context.onMessage({ type: 'error', text: '短信同步间隔必须是 1 到 1440 之间的整数分钟' });
      return;
    }
    setSavingSmsSync(true);
    try {
      const data = await apiFetch<{ sync?: SmsSettingsResponse }>('/api/dashboard/sms/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: smsSyncConfig.enabled, interval }),
      }, '保存失败');
      setSmsSyncConfig(mapSmsConfig(data.sync || {}, interval));
      context.onMessage({ type: 'success', text: '短信自动同步设置已保存' });
      context.onSaved();
    } catch (error) {
      context.onMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSavingSmsSync(false);
    }
  }, [context, smsSyncConfig.enabled, smsSyncConfig.interval]);

  const smsState = !smsSyncConfig.enabled ? '已暂停' : smsSyncConfig.running ? '运行中' : '等待启动';
  return { smsSyncConfig, setSmsSyncConfig, initialLoading, savingSmsSync, smsState, saveSmsSyncConfig };
}
