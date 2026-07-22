'use client';

import { KeyRound } from 'lucide-react';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import { SaveButton } from '@/components/settings/SaveButton';
import FieldGroup from '@/components/forms/FieldGroup';
import { Input } from '@/components/ui/input';
import type { PasswordFormState } from '@/features/settings/types';

interface PasswordSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  passwordForm: PasswordFormState;
  setPasswordForm: (value: PasswordFormState) => void;
  loading: boolean;
  onSave: () => void;
}

export function PasswordSection({
  open,
  onOpenChange,
  passwordForm,
  setPasswordForm,
  loading,
  onSave,
}: PasswordSectionProps) {
  return (
    <SettingsAccordionSection
      id="security"
      icon={<KeyRound className="h-3.5 w-3.5" />}
      eyebrow="Access control"
      title="访问安全"
      description="修改管理台登录密码。"
      open={open}
      onOpenChange={onOpenChange}
      summary={[
        { label: '管理员账户', value: 'admin' },
        { label: '密码策略', value: '本地 bcrypt 哈希存储' },
      ]}
    >
      <div className="fluid-card-grid gap-3 [--fluid-card-min:14rem]">
        <FieldGroup label="当前密码">
          <Input
            className="h-9 rounded-lg bg-background/60"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm({
              ...passwordForm,
              currentPassword: event.target.value,
            })}
          />
        </FieldGroup>
        <FieldGroup label="新密码">
          <Input
            className="h-9 rounded-lg bg-background/60"
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm({
              ...passwordForm,
              newPassword: event.target.value,
            })}
          />
        </FieldGroup>
        <FieldGroup label="确认新密码">
          <Input
            className="h-9 rounded-lg bg-background/60"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) => setPasswordForm({
              ...passwordForm,
              confirmPassword: event.target.value,
            })}
          />
        </FieldGroup>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="text-xs text-muted-foreground">修改成功后，新密码将用于下一次登录。</p>
        <SaveButton saving={loading} onClick={onSave} label="更新管理员密码" />
      </div>
    </SettingsAccordionSection>
  );
}

export default PasswordSection;
