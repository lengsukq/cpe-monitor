'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { DataQuotaForm, SettingsActionContext } from '@/features/settings/types';

const DEFAULT_QUOTA: DataQuotaForm = {
  enabled: false,
  quotaGb: '',
  alertLevels: '80,90,100',
  resetDay: '1',
};

export function useDataQuotaSettings(ctx: SettingsActionContext) {
  const [dataQuota, setDataQuota] = useState<DataQuotaForm>(DEFAULT_QUOTA);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingQuota, setSavingQuota] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<DataQuotaForm>('/api/settings/quota', undefined, '加载配额设置失败');
        setDataQuota({
          enabled: data.enabled ?? false,
          quotaGb: data.quotaGb ?? '',
          alertLevels: data.alertLevels ?? '80,90,100',
          resetDay: data.resetDay ?? '1',
        });
      } catch {
        // use defaults
      } finally {
        setInitialLoading(false);
      }
    };
    void load();
  }, []);

  const saveDataQuota = useCallback(async () => {
    setSavingQuota(true);
    try {
      await apiFetch('/api/settings/quota', {
        method: 'POST',
        body: JSON.stringify({
          enabled: dataQuota.enabled,
          quotaGb: dataQuota.quotaGb,
          alertLevels: dataQuota.alertLevels,
          resetDay: dataQuota.resetDay,
        }),
      }, '保存配额设置失败');
      ctx.onMessage({ type: 'success', text: '流量配额设置已保存' });
      ctx.onSaved();
    } catch (error) {
      ctx.onMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSavingQuota(false);
    }
  }, [ctx, dataQuota]);

  return {
    dataQuota,
    setDataQuota,
    initialLoading,
    savingQuota,
    saveDataQuota,
  };
}
