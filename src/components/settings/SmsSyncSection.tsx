'use client';

import { MessageSquareText } from 'lucide-react';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import { SaveButton } from '@/components/settings/SaveButton';
import FieldGroup from '@/components/forms/FieldGroup';
import { Callout } from '@/components/Callout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatSyncTime } from '@/lib/format';
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
    <SettingsAccordionSection
      id="automation"
      icon={<MessageSquareText className="h-3.5 w-3.5" />}
      eyebrow="Automation"
      title="短信自动同步"
      description="独立持久化；首次同步不会批量推送历史通知。"
      open={open}
      onOpenChange={onOpenChange}
      status={
        <Badge variant={smsSyncConfig.enabled ? 'success' : 'secondary'}>
          {smsState}
        </Badge>
      }
      summary={[
        { label: '自动同步', value: smsSyncConfig.enabled ? '已启用' : '已暂停' },
        { label: '同步间隔', value: `每 ${smsSyncConfig.interval} 分钟` },
        { label: '最近同步', value: formatSyncTime(smsSyncConfig.lastSyncedAt) },
        { label: '最近错误', value: smsSyncConfig.lastError || '无' },
      ]}
    >
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
        <div>
          <p className="text-sm font-medium">启用自动同步</p>
          <p className="text-xs text-muted-foreground">关闭后仍可在短信页手动同步</p>
        </div>
        <Switch
          checked={smsSyncConfig.enabled}
          disabled={savingSmsSync}
          onCheckedChange={(enabled) => setSmsSyncConfig({ ...smsSyncConfig, enabled })}
          aria-label="启用短信自动同步"
        />
      </div>
      <FieldGroup label="同步间隔（分钟）" hint="1–1440 的整数，默认 15。">
        <Input
          className="h-9 rounded-lg bg-background/60"
          type="number"
          min="1"
          max="1440"
          step="1"
          value={smsSyncConfig.interval}
          onChange={(event) => setSmsSyncConfig({ ...smsSyncConfig, interval: event.target.value })}
        />
      </FieldGroup>
      {smsSyncConfig.lastError ? (
        <Callout tone="warning">上次同步失败：{smsSyncConfig.lastError}</Callout>
      ) : null}
      <div className="flex justify-end border-t border-border/60 pt-3">
        <SaveButton saving={savingSmsSync} onClick={onSave} label="保存自动化设置" />
      </div>
    </SettingsAccordionSection>
  );
}

export default SmsSyncSection;
