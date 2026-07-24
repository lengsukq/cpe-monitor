'use client';

import { useCallback } from 'react';
import { useSyncSettings } from './useSyncSettings';
import type { DeviceInfoSyncConfigForm, SettingsActionContext } from '../types';

export function useDeviceInfoSyncSettings(context: SettingsActionContext) {
  const syncNowSuccessMessage = useCallback(
    (data: { result?: { deviceName?: string | null } }) => {
      const deviceLabel = data.result?.deviceName ? `（${data.result.deviceName}）` : '';
      return `设备信息已同步并入库${deviceLabel}`;
    },
    [],
  );

  const { config, setConfig, initialLoading, saving, syncing, stateLabel, save, syncNow } = useSyncSettings({
    endpoint: '/api/settings/device-info-sync',
    defaultInterval: 360,
    min: 30,
    max: 10080,
    label: '设备信息定时同步',
    syncNowEndpoint: '/api/dashboard/device/sync',
    syncNowSuccessMessage,
    context,
  });

  return {
    deviceInfoSyncConfig: config as DeviceInfoSyncConfigForm,
    setDeviceInfoSyncConfig: setConfig,
    initialLoading,
    savingDeviceInfoSync: saving,
    syncingDeviceInfo: syncing,
    deviceInfoState: stateLabel,
    saveDeviceInfoSyncConfig: save,
    runDeviceInfoSyncNow: syncNow,
  };
}
