'use client';

import { HardDrive } from 'lucide-react';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import { SaveButton } from '@/components/settings/SaveButton';
import FieldGroup from '@/components/forms/FieldGroup';
import { Callout } from '@/components/Callout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatSyncTime } from '@/lib/format';
import type { DeviceInfoSyncConfigForm } from '@/features/settings/types';

interface DeviceInfoSyncSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceInfoSyncConfig: DeviceInfoSyncConfigForm;
  setDeviceInfoSyncConfig: (value: DeviceInfoSyncConfigForm) => void;
  deviceInfoState: string;
  savingDeviceInfoSync: boolean;
  syncingDeviceInfo: boolean;
  onSave: () => void;
  onSyncNow: () => void;
}

export function DeviceInfoSyncSection({
  open,
  onOpenChange,
  deviceInfoSyncConfig,
  setDeviceInfoSyncConfig,
  deviceInfoState,
  savingDeviceInfoSync,
  syncingDeviceInfo,
  onSave,
  onSyncNow,
}: DeviceInfoSyncSectionProps) {
  const busy = savingDeviceInfoSync || syncingDeviceInfo;

  return (
    <SettingsAccordionSection
      id="device-info-sync"
      icon={<HardDrive className="h-3.5 w-3.5" />}
      eyebrow="Long-term storage"
      title="设备信息定时同步"
      description="将 IMEI、版本、WAN IP 等慢变身份信息长期入库；默认每 6 小时更新，与流量采集相互独立。"
      open={open}
      onOpenChange={onOpenChange}
      status={
        <Badge variant={deviceInfoSyncConfig.enabled ? 'success' : 'secondary'}>
          {deviceInfoState}
        </Badge>
      }
      summary={[
        { label: '自动同步', value: deviceInfoSyncConfig.enabled ? '已启用' : '已暂停' },
        { label: '同步间隔', value: `每 ${deviceInfoSyncConfig.interval} 分钟` },
        { label: '最近同步', value: formatSyncTime(deviceInfoSyncConfig.lastSyncedAt) },
        { label: '最近错误', value: deviceInfoSyncConfig.lastError || '无' },
      ]}
    >
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-3 py-3">
        <div>
          <p className="text-sm font-medium">启用自动同步</p>
          <p className="text-xs text-muted-foreground">关闭后仍可手动同步；设备页在 CPE 离线时可回退缓存</p>
        </div>
        <Switch
          checked={deviceInfoSyncConfig.enabled}
          disabled={busy}
          onCheckedChange={(enabled) => setDeviceInfoSyncConfig({
            ...deviceInfoSyncConfig,
            enabled,
          })}
          aria-label="启用设备信息自动同步"
        />
      </div>
      <FieldGroup
        label="同步间隔（分钟）"
        hint="30–10080 的整数，默认 360（6 小时）。适合版本、序列号、WAN 地址等慢变字段。"
      >
        <Input
          className="h-9 rounded-lg bg-background/60"
          type="number"
          min="30"
          max="10080"
          step="1"
          value={deviceInfoSyncConfig.interval}
          onChange={(event) => setDeviceInfoSyncConfig({
            ...deviceInfoSyncConfig,
            interval: event.target.value,
          })}
        />
      </FieldGroup>
      {deviceInfoSyncConfig.lastError ? (
        <Callout tone="warning">上次同步失败：{deviceInfoSyncConfig.lastError}</Callout>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onSyncNow}
        >
          {syncingDeviceInfo ? '同步中…' : '立即同步'}
        </Button>
        <SaveButton saving={savingDeviceInfoSync} onClick={onSave} label="保存设备同步设置" />
      </div>
    </SettingsAccordionSection>
  );
}
