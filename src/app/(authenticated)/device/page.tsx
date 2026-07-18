'use client';

import { PageHeader } from '@/components/PageHeader';
import { Callout } from '@/components/Callout';
import { PageShell } from '@/components/PageShell';
import { LoadingBlock } from '@/components/LoadingBlock';
import DeviceDetailDialog from '@/components/DeviceDetailDialog';
import RefreshButton from '@/components/RefreshButton';
import DeviceIdentityHero from '@/components/device/DeviceIdentityHero';
import CapabilitySummaryRow from '@/components/device/CapabilitySummaryRow';
import DeviceInfoSections from '@/components/device/DeviceInfoSections';
import OnlineDevicesTable from '@/components/device/OnlineDevicesTable';
import { useDevicePage } from '@/hooks/useDevicePage';
import { getDisplayValue } from '@/lib/device-display';

export default function DevicePage() {
  const {
    deviceInfo,
    loading,
    rawDevices,
    devicesLoading,
    selectedDevice,
    setSelectedDevice,
    dialogOpen,
    setDialogOpen,
    deviceError,
    devicesError,
    refreshDevicePage,
  } = useDevicePage();

  if (loading) {
    return <LoadingBlock />;
  }

  const info = deviceInfo?.deviceInformation;
  const deviceState = deviceInfo?.deviceInfo;
  const onlineState = deviceInfo?.onlineState;
  const cell = deviceInfo?.cellInformation;
  const vendor = getDisplayValue(deviceInfo?.vendorName, ['vendorname', 'VendorName', 'vendor', 'name']);
  const wlanDbho = deviceInfo?.wlanDbho;
  const topology = deviceInfo?.topology;
  const devCapacity = deviceInfo?.devCapacity;
  const portalSettings = deviceInfo?.portalSettings;
  const iocDeviceCapacity = deviceInfo?.iocDeviceCapacity;

  return (
    <PageShell>
      <PageHeader
        title="设备信息"
        description="聚合设备身份、蜂窝状态、拓扑、能力和在线终端接口。"
        actions={
          <RefreshButton onClick={() => { void refreshDevicePage(); }} />
        }
      />

      {deviceError ? <Callout tone="danger">{deviceError}</Callout> : null}

      {info ? (
        <>
          <DeviceIdentityHero info={info} cell={cell} />
          <CapabilitySummaryRow
            vendor={vendor}
            deviceName={info.DeviceName}
            wlanDbho={wlanDbho}
            topology={topology}
          />
          <DeviceInfoSections
            info={info}
            deviceState={deviceState}
            onlineState={onlineState}
            cell={cell}
            vendor={vendor}
            wlanDbho={wlanDbho}
            topology={topology}
            devCapacity={devCapacity}
            portalSettings={portalSettings}
            iocDeviceCapacity={iocDeviceCapacity}
          />
        </>
      ) : null}

      <OnlineDevicesTable
        devices={rawDevices}
        loading={devicesLoading}
        error={devicesError}
        onSelect={(device) => {
          setSelectedDevice(device);
          setDialogOpen(true);
        }}
      />

      <DeviceDetailDialog
        device={selectedDevice}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </PageShell>
  );
}
