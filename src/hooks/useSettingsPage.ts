'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { formatSyncTime, maskSecret } from '@/lib/format';

export type SettingsSectionId = 'connection' | 'automation' | 'email' | 'wechat' | 'security';

export interface CpeConfigForm {
  cpeUrl: string;
  cpeUsername: string;
  cpePassword: string;
}

export interface EmailConfigForm {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  from: string;
  to: string;
}

export interface WechatConfigForm {
  webhookUrl: string;
}

export interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SmsSyncConfigForm {
  enabled: boolean;
  interval: string;
  running: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
}

export interface UpdateStatusState {
  updateState?: string;
  message?: string;
  error?: string;
}

export interface TestResultState {
  success: boolean;
  message: string;
  latency?: string;
}

const DEFAULT_CPE: CpeConfigForm = {
  cpeUrl: 'http://192.168.31.1',
  cpeUsername: 'admin',
  cpePassword: '',
};

const DEFAULT_EMAIL: EmailConfigForm = {
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  from: '',
  to: '',
};

export function useSettingsPage() {
  const [cpeConfig, setCpeConfig] = useState<CpeConfigForm>(DEFAULT_CPE);
  const [emailConfig, setEmailConfig] = useState<EmailConfigForm>(DEFAULT_EMAIL);
  const [wechatConfig, setWechatConfig] = useState<WechatConfigForm>({ webhookUrl: '' });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [smsSyncConfig, setSmsSyncConfig] = useState<SmsSyncConfigForm>({
    enabled: true,
    interval: '15',
    running: false,
    lastSyncedAt: null,
    lastError: null,
  });

  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResultState | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusState | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [savingSmsSync, setSavingSmsSync] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [openSection, setOpenSection] = useState<SettingsSectionId | null>(null);

  const collapseSection = useCallback(() => setOpenSection(null), []);

  const fetchUpdateStatus = useCallback(async () => {
    try {
      const data = await apiFetch<UpdateStatusState>(
        '/api/system/update',
        undefined,
        '无法获取升级状态',
      );
      setUpdateStatus(data);
    } catch (error) {
      setUpdateStatus({
        error: error instanceof Error ? error.message : '无法获取升级状态',
      });
    }
  }, []);

  const fetchConfigs = useCallback(async () => {
    try {
      const [cpeData, notifData, smsSyncData] = await Promise.all([
        apiFetch<Record<string, unknown>>('/api/settings/cpe', undefined, '获取CPE配置失败'),
        apiFetch<Array<{ type: string; config: string }>>(
          '/api/settings/notification',
          undefined,
          '获取通知配置失败',
        ),
        apiFetch<{
          enabled?: boolean;
          interval?: number;
          running?: boolean;
          lastSyncedAt?: string | null;
          lastError?: string | null;
        }>('/api/dashboard/sms/settings', undefined, '获取短信同步设置失败'),
      ]);

      if (cpeData.cpe_url) {
        setCpeConfig({
          cpeUrl: String(cpeData.cpe_url),
          cpeUsername: String(cpeData.cpe_username || 'admin'),
          cpePassword: '',
        });
      }

      for (const config of notifData) {
        if (config.type === 'email') {
          setEmailConfig(JSON.parse(config.config) as EmailConfigForm);
        } else if (config.type === 'wechat') {
          setWechatConfig(JSON.parse(config.config) as WechatConfigForm);
        }
      }

      setSmsSyncConfig({
        enabled: Boolean(smsSyncData.enabled),
        interval: String(smsSyncData.interval || 15),
        running: Boolean(smsSyncData.running),
        lastSyncedAt: smsSyncData.lastSyncedAt || null,
        lastError: smsSyncData.lastError || null,
      });
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfigs();
    void fetchUpdateStatus();
  }, [fetchConfigs, fetchUpdateStatus]);

  async function saveCpeConfig() {
    setLoading(true);
    try {
      await apiFetch(
        '/api/settings/cpe',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cpeConfig),
        },
        '保存失败',
      );
      setMessage({ type: 'success', text: 'CPE 配置已保存' });
      collapseSection();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function testCpeConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const data = await apiFetch<TestResultState>(
        '/api/settings/cpe/test',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cpeConfig),
        },
        '测试请求失败',
      );
      setTestResult(data);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试请求失败',
      });
    } finally {
      setTesting(false);
    }
  }

  async function checkSystemUpdate() {
    setCheckingUpdate(true);
    try {
      const data = await apiFetch<UpdateStatusState>(
        '/api/system/update',
        { method: 'POST' },
        '检查更新失败',
      );
      setUpdateStatus(data);
    } catch (error) {
      setUpdateStatus({
        error: error instanceof Error ? error.message : '检查更新请求失败',
      });
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function saveEmailConfig() {
    setLoading(true);
    try {
      await apiFetch(
        '/api/settings/notification',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'email', config: emailConfig, enabled: true }),
        },
        '保存失败',
      );
      setMessage({ type: 'success', text: '邮件配置已保存' });
      collapseSection();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function saveWechatConfig() {
    setLoading(true);
    try {
      await apiFetch(
        '/api/settings/notification',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'wechat', config: wechatConfig, enabled: true }),
        },
        '保存失败',
      );
      setMessage({ type: 'success', text: '企业微信配置已保存' });
      collapseSection();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function saveSmsSyncConfig() {
    const interval = Number(smsSyncConfig.interval);
    if (!Number.isInteger(interval) || interval < 1 || interval > 1440) {
      setMessage({ type: 'error', text: '短信同步间隔必须是 1 到 1440 之间的整数分钟' });
      return;
    }

    setSavingSmsSync(true);
    try {
      const data = await apiFetch<{
        sync?: {
          enabled?: boolean;
          interval?: number;
          running?: boolean;
          lastSyncedAt?: string | null;
          lastError?: string | null;
        };
      }>(
        '/api/dashboard/sms/settings',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: smsSyncConfig.enabled, interval }),
        },
        '保存失败',
      );

      const sync = data.sync || {};
      setSmsSyncConfig({
        enabled: Boolean(sync.enabled),
        interval: String(sync.interval || interval),
        running: Boolean(sync.running),
        lastSyncedAt: sync.lastSyncedAt || null,
        lastError: sync.lastError || null,
      });
      setMessage({ type: 'success', text: '短信自动同步设置已保存' });
      collapseSection();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存失败' });
    } finally {
      setSavingSmsSync(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }

    setLoading(true);
    try {
      await apiFetch(
        '/api/settings/password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        },
        '修改失败',
      );
      setMessage({ type: 'success', text: '密码已修改' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      collapseSection();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '修改失败' });
    } finally {
      setLoading(false);
    }
  }

  const smsState = !smsSyncConfig.enabled
    ? '已暂停'
    : smsSyncConfig.running
      ? '运行中'
      : '等待启动';
  const emailConfigured = Boolean(emailConfig.smtpHost && emailConfig.to);
  const wechatConfigured = Boolean(wechatConfig.webhookUrl);
  const recipientCount = emailConfig.to
    ? emailConfig.to.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean).length
    : 0;

  const overviewMeta = useMemo(
    () => ({
      cpeConfigured: Boolean(cpeConfig.cpeUrl),
      cpeUrl: cpeConfig.cpeUrl,
      smsEnabled: smsSyncConfig.enabled,
      smsInterval: smsSyncConfig.interval,
      smsLastSyncedAt: smsSyncConfig.lastSyncedAt,
      smsLastError: smsSyncConfig.lastError,
      emailConfigured,
      emailHost: emailConfig.smtpHost,
      recipientCount,
      wechatConfigured,
      wechatMasked: wechatConfigured ? maskSecret(wechatConfig.webhookUrl) : '',
      smsSyncLabel: formatSyncTime(smsSyncConfig.lastSyncedAt),
    }),
    [
      cpeConfig.cpeUrl,
      smsSyncConfig.enabled,
      smsSyncConfig.interval,
      smsSyncConfig.lastSyncedAt,
      smsSyncConfig.lastError,
      emailConfigured,
      emailConfig.smtpHost,
      recipientCount,
      wechatConfigured,
      wechatConfig.webhookUrl,
    ],
  );

  return {
    cpeConfig,
    setCpeConfig,
    emailConfig,
    setEmailConfig,
    wechatConfig,
    setWechatConfig,
    passwordForm,
    setPasswordForm,
    smsSyncConfig,
    setSmsSyncConfig,
    pageLoading,
    loading,
    testing,
    testResult,
    updateStatus,
    checkingUpdate,
    savingSmsSync,
    message,
    openSection,
    setOpenSection,
    smsState,
    emailConfigured,
    wechatConfigured,
    recipientCount,
    overviewMeta,
    saveCpeConfig,
    testCpeConnection,
    saveEmailConfig,
    saveWechatConfig,
    saveSmsSyncConfig,
    changePassword,
    fetchUpdateStatus,
    checkSystemUpdate,
  };
}
