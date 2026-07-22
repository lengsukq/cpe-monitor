'use client';

import { useCallback, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { PasswordFormState, SettingsActionContext } from '../types';

const EMPTY_PASSWORD: PasswordFormState = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function usePasswordSettings(context: SettingsActionContext) {
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD);
  const [savingPassword, setSavingPassword] = useState(false);

  const changePassword = useCallback(async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      context.onMessage({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }
    setSavingPassword(true);
    try {
      await apiFetch('/api/settings/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      }, '修改失败');
      context.onMessage({ type: 'success', text: '密码已修改' });
      setPasswordForm(EMPTY_PASSWORD);
      context.onSaved();
    } catch (error) {
      context.onMessage({ type: 'error', text: error instanceof Error ? error.message : '修改失败' });
    } finally {
      setSavingPassword(false);
    }
  }, [context, passwordForm]);

  return { passwordForm, setPasswordForm, savingPassword, changePassword };
}
