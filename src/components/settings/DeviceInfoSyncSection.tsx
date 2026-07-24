'use client';

import { HardDrive } from 'lucide-react';
import { SyncSettingsSection } from '@/components/settings/SyncSettingsSection';
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
  return (
    <SyncSettingsSection
      id="device-info-sync"
      icon={<HardDrive className="h-3.5 w-3.5" />}
      eyebrow="Long-term storage"
      title="设备信息定时同步"
      description="将 IMEI、版本、WAN IP 等慢变身份信息长期入库；默认每 6 小时更新，与流量采集相互独立。"
      open={open}
      onOpenChange={onOpenChange}
      config={deviceInfoSyncConfig}
      setConfig={setDeviceInfoSyncConfig}
      stateLabel={deviceInfoState}
      saving={savingDeviceInfoSync}
      onSave={onSave}
      min={30}
      max={10080}
      hint="30–10080 的整数，默认 360（6 小时）。适合版本、序列号、WAN 地址等慢变字段。"
      switchDescription="关闭后仍可手动同步；设备页在 CPE 离线时可回退缓存"
      switchAriaLabel="启用设备信息自动同步"
      saveLabel="保存设备同步设置"
      syncing={syncingDeviceInfo}
      onSyncNow={onSyncNow}
    />
  );
}
