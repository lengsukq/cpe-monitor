'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { CpeConfigForm, SettingsActionContext, TestResultState } from '../types';

const DEFAULT_CPE: CpeConfigForm = {
  cpeUrl: 'http://192.168.31.1',
  cpeUsername: 'admin',
  cpePassword: '',
};

export function useCpeSettings(context: SettingsActionContext) {
  const [cpeConfig, setCpeConfig] = useState<CpeConfigForm>(DEFAULT_CPE);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultState | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiFetch<Record<string, unknown>>('/api/settings/cpe', undefined, '获取CPE配置失败');
      if (data.cpe_url) {
        setCpeConfig({
          cpeUrl: String(data.cpe_url),
          cpeUsername: String(data.cpe_username || 'admin'),
          cpePassword: '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch CPE config:', error);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchConfig(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchConfig]);

  const saveCpeConfig = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch('/api/settings/cpe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpeConfig),
      }, '保存失败');
      context.onMessage({ type: 'success', text: 'CPE 配置已保存' });
      context.onSaved();
    } catch (error) {
      context.onMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSaving(false);
    }
  }, [context, cpeConfig]);

  const testCpeConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await apiFetch<TestResultState>('/api/settings/cpe/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpeConfig),
      }, '测试请求失败');
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, message: error instanceof Error ? error.message : '测试请求失败' });
    } finally {
      setTesting(false);
    }
  }, [cpeConfig]);

  return { cpeConfig, setCpeConfig, initialLoading, saving, testing, testResult, saveCpeConfig, testCpeConnection };
}
