'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { DeviceInfoSyncConfigForm, SettingsActionContext } from '../types';

interface DeviceInfoSettingsResponse {
  enabled?: boolean;
  interval?: number;
  running?: boolean;
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

const DEFAULT_DEVICE_INFO_SYNC: DeviceInfoSyncConfigForm = {
  enabled: true,
  interval: '360',
  running: false,
  lastSyncedAt: null,
  lastError: null,
};

function mapDeviceInfoConfig(
  data: DeviceInfoSettingsResponse,
  fallbackInterval = 360,
): DeviceInfoSyncConfigForm {
  return {
    enabled: Boolean(data.enabled),
    interval: String(data.interval || fallbackInterval),
    running: Boolean(data.running),
    lastSyncedAt: data.lastSyncedAt || null,
    lastError: data.lastError || null,
  };
}

export function useDeviceInfoSyncSettings(context: SettingsActionContext) {
  const [deviceInfoSyncConfig, setDeviceInfoSyncConfig] = useState<DeviceInfoSyncConfigForm>(
    DEFAULT_DEVICE_INFO_SYNC,
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingDeviceInfoSync, setSavingDeviceInfoSync] = useState(false);
  const [syncingDeviceInfo, setSyncingDeviceInfo] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiFetch<DeviceInfoSettingsResponse>(
        '/api/settings/device-info-sync',
        undefined,
        '获取设备信息同步设置失败',
      );
      setDeviceInfoSyncConfig(mapDeviceInfoConfig(data));
    } catch (error) {
      console.error('Failed to fetch device info sync config:', error);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchConfig();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchConfig]);

  const saveDeviceInfoSyncConfig = useCallback(async () => {
    const interval = Number(deviceInfoSyncConfig.interval);
    if (!Number.isInteger(interval) || interval < 30 || interval > 10080) {
      context.onMessage({
        type: 'error',
        text: '设备信息同步间隔必须是 30 到 10080 之间的整数分钟',
      });
      return;
    }
    setSavingDeviceInfoSync(true);
    try {
      const data = await apiFetch<{ sync?: DeviceInfoSettingsResponse }>(
        '/api/settings/device-info-sync',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: deviceInfoSyncConfig.enabled, interval }),
        },
        '保存失败',
      );
      setDeviceInfoSyncConfig(mapDeviceInfoConfig(data.sync || {}, interval));
      context.onMessage({ type: 'success', text: '设备信息定时同步设置已保存' });
      context.onSaved();
    } catch (error) {
      context.onMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '保存失败',
      });
    } finally {
      setSavingDeviceInfoSync(false);
    }
  }, [context, deviceInfoSyncConfig.enabled, deviceInfoSyncConfig.interval]);

  const runDeviceInfoSyncNow = useCallback(async () => {
    setSyncingDeviceInfo(true);
    try {
      const data = await apiFetch<{
        success?: boolean;
        sync?: DeviceInfoSettingsResponse;
        result?: { deviceName?: string | null };
      }>(
        '/api/dashboard/device/sync',
        { method: 'POST' },
        '手动同步失败',
      );
      if (data.sync) {
        setDeviceInfoSyncConfig(mapDeviceInfoConfig(data.sync));
      } else {
        await fetchConfig();
      }
      const deviceLabel = data.result?.deviceName ? `（${data.result.deviceName}）` : '';
      context.onMessage({ type: 'success', text: `设备信息已同步并入库${deviceLabel}` });
    } catch (error) {
      context.onMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '手动同步失败',
      });
    } finally {
      setSyncingDeviceInfo(false);
    }
  }, [context, fetchConfig]);

  const deviceInfoState = !deviceInfoSyncConfig.enabled
    ? '已暂停'
    : deviceInfoSyncConfig.running
      ? '运行中'
      : '等待启动';

  return {
    deviceInfoSyncConfig,
    setDeviceInfoSyncConfig,
    initialLoading,
    savingDeviceInfoSync,
    syncingDeviceInfo,
    deviceInfoState,
    saveDeviceInfoSyncConfig,
    runDeviceInfoSyncNow,
  };
}
