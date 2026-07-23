'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatSyncTime, maskSecret } from '@/lib/format';
import { useCpeSettings } from '@/features/settings/hooks/useCpeSettings';
import { useDataRetentionSettings } from '@/features/settings/hooks/useDataRetentionSettings';
import { useNotificationSettings } from '@/features/settings/hooks/useNotificationSettings';
import { usePasswordSettings } from '@/features/settings/hooks/usePasswordSettings';
import { useSmsSyncSettings } from '@/features/settings/hooks/useSmsSyncSettings';
import { useDeviceInfoSyncSettings } from '@/features/settings/hooks/useDeviceInfoSyncSettings';
import { useSystemUpdate } from '@/features/settings/hooks/useSystemUpdate';
import type { SettingsActionContext, SettingsMessage, SettingsSectionId } from '@/features/settings/types';

export type {
  CpeConfigForm,
  DataRetentionForm,
  DeviceInfoSyncConfigForm,
  EmailConfigForm,
  PasswordFormState,
  SettingsSectionId,
  SmsSyncConfigForm,
  TestResultState,
  UpdateStatusState,
  WechatConfigForm,
} from '@/features/settings/types';

export function useSettingsPage() {
  const [message, setMessage] = useState<SettingsMessage>({ type: '', text: '' });
  const [openSection, setOpenSection] = useState<SettingsSectionId | null>(null);
  const collapseSection = useCallback(() => setOpenSection(null), []);
  const onMessage = useCallback((next: SettingsMessage) => setMessage(next), []);
  const actionContext = useMemo<SettingsActionContext>(() => ({ onMessage, onSaved: collapseSection }), [collapseSection, onMessage]);

  const cpe = useCpeSettings(actionContext);
  const notifications = useNotificationSettings(actionContext);
  const sms = useSmsSyncSettings(actionContext);
  const deviceInfoSync = useDeviceInfoSyncSettings(actionContext);
  const retention = useDataRetentionSettings(actionContext);
  const password = usePasswordSettings(actionContext);
  const update = useSystemUpdate();

  const pageLoading = cpe.initialLoading
    || notifications.initialLoading
    || sms.initialLoading
    || deviceInfoSync.initialLoading
    || retention.initialLoading;
  const loading = cpe.saving || notifications.savingEmail || notifications.savingWechat || password.savingPassword;

  const overviewMeta = useMemo(() => ({
    cpeConfigured: Boolean(cpe.cpeConfig.cpeUrl),
    cpeUrl: cpe.cpeConfig.cpeUrl,
    smsEnabled: sms.smsSyncConfig.enabled,
    smsInterval: sms.smsSyncConfig.interval,
    smsLastSyncedAt: sms.smsSyncConfig.lastSyncedAt,
    smsLastError: sms.smsSyncConfig.lastError,
    emailConfigured: notifications.emailConfigured,
    emailHost: notifications.emailConfig.smtpHost,
    recipientCount: notifications.recipientCount,
    wechatConfigured: notifications.wechatConfigured,
    wechatMasked: notifications.wechatConfig.webhookUrl
      ? maskSecret(notifications.wechatConfig.webhookUrl)
      : notifications.wechatWebhookSet ? '已安全保存' : '',
    smsSyncLabel: formatSyncTime(sms.smsSyncConfig.lastSyncedAt),
  }), [cpe.cpeConfig.cpeUrl, notifications, sms.smsSyncConfig]);

  return {
    ...cpe,
    ...notifications,
    ...sms,
    ...deviceInfoSync,
    ...retention,
    ...password,
    ...update,
    pageLoading,
    loading,
    message,
    openSection,
    setOpenSection,
    overviewMeta,
  };
}
