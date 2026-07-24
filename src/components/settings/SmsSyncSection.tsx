'use client';

import { MessageSquareText } from 'lucide-react';
import { SyncSettingsSection } from '@/components/settings/SyncSettingsSection';
import type { SmsSyncConfigForm } from '@/features/settings/types';

interface SmsSyncSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  smsSyncConfig: SmsSyncConfigForm;
  setSmsSyncConfig: (value: SmsSyncConfigForm) => void;
  smsState: string;
  savingSmsSync: boolean;
  onSave: () => void;
}

export function SmsSyncSection({
  open,
  onOpenChange,
  smsSyncConfig,
  setSmsSyncConfig,
  smsState,
  savingSmsSync,
  onSave,
}: SmsSyncSectionProps) {
  return (
    <SyncSettingsSection
      id="automation"
      icon={<MessageSquareText className="h-3.5 w-3.5" />}
      eyebrow="Automation"
      title="短信自动同步"
      description="独立持久化；首次同步不会批量推送历史通知。"
      open={open}
      onOpenChange={onOpenChange}
      config={smsSyncConfig}
      setConfig={setSmsSyncConfig}
      stateLabel={smsState}
      saving={savingSmsSync}
      onSave={onSave}
      min={1}
      max={1440}
      hint="1–1440 的整数，默认 15。"
      switchDescription="关闭后仍可在短信页手动同步"
      switchAriaLabel="启用短信自动同步"
      saveLabel="保存自动化设置"
    />
  );
}

export default SmsSyncSection;
