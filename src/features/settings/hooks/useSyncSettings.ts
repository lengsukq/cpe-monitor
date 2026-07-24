'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { SettingsActionContext, SyncConfigForm } from '../types';

interface SyncSettingsResponse {
  enabled?: boolean;
  interval?: number;
  running?: boolean;
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

export interface UseSyncSettingsOptions {
  /** API endpoint for GET/POST sync settings */
  endpoint: string;
  defaultInterval: number;
  min: number;
  max: number;
  /** Human-readable label for messages, e.g. '短信自动同步' */
  label: string;
  /** Optional endpoint for manual sync-now action */
  syncNowEndpoint?: string;
  /** Success message after sync-now completes; receives response data */
  syncNowSuccessMessage?: (data: { result?: { deviceName?: string | null } }) => string;
  context: SettingsActionContext;
}

function mapConfig(data: SyncSettingsResponse, fallbackInterval: number): SyncConfigForm {
  return {
    enabled: Boolean(data.enabled),
    interval: String(data.interval || fallbackInterval),
    running: Boolean(data.running),
    lastSyncedAt: data.lastSyncedAt || null,
    lastError: data.lastError || null,
  };
}

export function useSyncSettings(options: UseSyncSettingsOptions) {
  const {
    endpoint,
    defaultInterval,
    min,
    max,
    label,
    syncNowEndpoint,
    syncNowSuccessMessage,
    context,
  } = options;

  const defaultConfig: SyncConfigForm = {
    enabled: true,
    interval: String(defaultInterval),
    running: false,
    lastSyncedAt: null,
    lastError: null,
  };

  const [config, setConfig] = useState<SyncConfigForm>(defaultConfig);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiFetch<SyncSettingsResponse>(endpoint, undefined, `获取${label}设置失败`);
      setConfig(mapConfig(data, defaultInterval));
    } catch (error) {
      console.error(`Failed to fetch ${label} config:`, error);
    } finally {
      setInitialLoading(false);
    }
  }, [endpoint, defaultInterval, label]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchConfig(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchConfig]);

  const save = useCallback(async () => {
    const interval = Number(config.interval);
    if (!Number.isInteger(interval) || interval < min || interval > max) {
      context.onMessage({
        type: 'error',
        text: `${label}间隔必须是 ${min} 到 ${max} 之间的整数分钟`,
      });
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch<{ sync?: SyncSettingsResponse }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: config.enabled, interval }),
      }, '保存失败');
      setConfig(mapConfig(data.sync || {}, interval));
      context.onMessage({ type: 'success', text: `${label}设置已保存` });
      context.onSaved();
    } catch (error) {
      context.onMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }, [context, config.enabled, config.interval, endpoint, label, min, max]);

  const syncNow = useCallback(async () => {
    if (!syncNowEndpoint) return;
    setSyncing(true);
    try {
      const data = await apiFetch<{
        success?: boolean;
        sync?: SyncSettingsResponse;
        result?: { deviceName?: string | null };
      }>(syncNowEndpoint, { method: 'POST' }, '手动同步失败');
      if (data.sync) {
        setConfig(mapConfig(data.sync, defaultInterval));
      } else {
        await fetchConfig();
      }
      const message = syncNowSuccessMessage
        ? syncNowSuccessMessage(data)
        : '同步完成';
      context.onMessage({ type: 'success', text: message });
    } catch (error) {
      context.onMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '手动同步失败',
      });
    } finally {
      setSyncing(false);
    }
  }, [context, fetchConfig, syncNowEndpoint, defaultInterval, syncNowSuccessMessage]);

  const stateLabel = !config.enabled ? '已暂停' : config.running ? '运行中' : '等待启动';

  return {
    config,
    setConfig,
    initialLoading,
    saving,
    syncing,
    stateLabel,
    save,
    syncNow,
  };
}
