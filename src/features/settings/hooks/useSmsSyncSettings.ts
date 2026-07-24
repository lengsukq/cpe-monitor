'use client';

import { useSyncSettings } from './useSyncSettings';
import type { SettingsActionContext, SmsSyncConfigForm } from '../types';

export function useSmsSyncSettings(context: SettingsActionContext) {
  const { config, setConfig, initialLoading, saving, stateLabel, save } = useSyncSettings({
    endpoint: '/api/dashboard/sms/settings',
    defaultInterval: 15,
    min: 1,
    max: 1440,
    label: '短信自动同步',
    context,
  });

  return {
    smsSyncConfig: config as SmsSyncConfigForm,
    setSmsSyncConfig: setConfig,
    initialLoading,
    savingSmsSync: saving,
    smsState: stateLabel,
    saveSmsSyncConfig: save,
  };
}
