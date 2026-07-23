'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { DataRetentionForm, SettingsActionContext } from '../types';

interface RetentionResponse {
  historyDays?: number;
  runDays?: number;
  lastCleanupAt?: string | null;
}

export function useDataRetentionSettings(context: SettingsActionContext) {
  const [dataRetention, setDataRetention] = useState<DataRetentionForm>({ historyDays: '90', runDays: '180', lastCleanupAt: null });
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingDataRetention, setSavingDataRetention] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiFetch<RetentionResponse>('/api/settings/data-retention', undefined, '获取数据保留设置失败');
      setDataRetention({ historyDays: String(data.historyDays || 90), runDays: String(data.runDays || 180), lastCleanupAt: data.lastCleanupAt || null });
    } catch (error) {
      console.error('Failed to fetch retention config:', error);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchConfig(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchConfig]);

  const saveDataRetention = useCallback(async (cleanupNow: boolean) => {
    const historyDays = Number(dataRetention.historyDays);
    const runDays = Number(dataRetention.runDays);
    if (!Number.isInteger(historyDays) || !Number.isInteger(runDays) || historyDays < 7 || historyDays > 3650 || runDays < 7 || runDays > 3650) {
      context.onMessage({ type: 'error', text: '数据保留天数必须是 7 到 3650 之间的整数' });
      return;
    }
    setSavingDataRetention(true);
    try {
      const response = await apiFetch<{
        config: { historyDays: number; runDays: number; lastCleanupAt: string | null };
        cleanup?: {
          trafficDeleted: number;
          devicesDeleted: number;
          deviceSnapshotsDeleted?: number;
          runsDeleted: number;
          cleanedAt: string;
        } | null;
      }>('/api/settings/data-retention', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historyDays, runDays, cleanupNow }),
      }, '保存数据保留设置失败');
      setDataRetention({
        historyDays: String(response.config.historyDays),
        runDays: String(response.config.runDays),
        lastCleanupAt: response.cleanup?.cleanedAt || response.config.lastCleanupAt,
      });
      const summary = response.cleanup
        ? `，已删除 ${response.cleanup.trafficDeleted} 条流量、${response.cleanup.devicesDeleted} 条终端、${response.cleanup.deviceSnapshotsDeleted || 0} 条设备快照和 ${response.cleanup.runsDeleted} 条采集记录`
        : '';
      context.onMessage({ type: 'success', text: `数据保留策略已保存${summary}` });
      context.onSaved();
    } catch (error) {
      context.onMessage({ type: 'error', text: error instanceof Error ? error.message : '保存数据保留设置失败' });
    } finally {
      setSavingDataRetention(false);
    }
  }, [context, dataRetention.historyDays, dataRetention.runDays]);

  return { dataRetention, setDataRetention, initialLoading, savingDataRetention, saveDataRetention };
}
