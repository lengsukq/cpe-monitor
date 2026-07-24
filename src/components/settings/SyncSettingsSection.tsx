'use client';

import type { ReactNode } from 'react';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import { SaveButton } from '@/components/settings/SaveButton';
import FieldGroup from '@/components/forms/FieldGroup';
import { Callout } from '@/components/Callout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatSyncTime } from '@/lib/format';
import type { SyncConfigForm } from '@/features/settings/types';

export interface SyncSettingsSectionProps {
  id: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SyncConfigForm;
  setConfig: (value: SyncConfigForm) => void;
  stateLabel: string;
  saving: boolean;
  onSave: () => void;
  /** Interval input constraints */
  min: number;
  max: number;
  hint: string;
  /** Switch row description */
  switchDescription: string;
  switchAriaLabel: string;
  saveLabel: string;
  /** Optional "sync now" action */
  syncing?: boolean;
  onSyncNow?: () => void;
  syncNowLabel?: string;
  syncNowLoadingLabel?: string;
}

export function SyncSettingsSection({
  id,
  icon,
  eyebrow,
  title,
  description,
  open,
  onOpenChange,
  config,
  setConfig,
  stateLabel,
  saving,
  onSave,
  min,
  max,
  hint,
  switchDescription,
  switchAriaLabel,
  saveLabel,
  syncing = false,
  onSyncNow,
  syncNowLabel = '立即同步',
  syncNowLoadingLabel = '同步中…',
}: SyncSettingsSectionProps) {
  const busy = saving || syncing;

  return (
    <SettingsAccordionSection
      id={id}
      icon={icon}
      eyebrow={eyebrow}
      title={title}
      description={description}
      open={open}
      onOpenChange={onOpenChange}
      status={
        <Badge variant={config.enabled ? 'success' : 'secondary'}>
          {stateLabel}
        </Badge>
      }
      summary={[
        { label: '自动同步', value: config.enabled ? '已启用' : '已暂停' },
        { label: '同步间隔', value: `每 ${config.interval} 分钟` },
        { label: '最近同步', value: formatSyncTime(config.lastSyncedAt) },
        { label: '最近错误', value: config.lastError || '无' },
      ]}
    >
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
        <div>
          <p className="text-sm font-medium">启用自动同步</p>
          <p className="text-xs text-muted-foreground">{switchDescription}</p>
        </div>
        <Switch
          checked={config.enabled}
          disabled={busy}
          onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
          aria-label={switchAriaLabel}
        />
      </div>
      <FieldGroup label="同步间隔（分钟）" hint={hint}>
        <Input
          className="h-9 rounded-lg bg-background/60"
          type="number"
          min={String(min)}
          max={String(max)}
          step="1"
          value={config.interval}
          onChange={(event) => setConfig({ ...config, interval: event.target.value })}
        />
      </FieldGroup>
      {config.lastError ? (
        <Callout tone="warning">上次同步失败：{config.lastError}</Callout>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
        {onSyncNow ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onSyncNow}
          >
            {syncing ? syncNowLoadingLabel : syncNowLabel}
          </Button>
        ) : null}
        <SaveButton saving={saving} onClick={onSave} label={saveLabel} />
      </div>
    </SettingsAccordionSection>
  );
}
