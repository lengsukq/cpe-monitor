'use client';

import { Router } from 'lucide-react';
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
import SignalMetricsOverview from '@/components/device/SignalMetricsOverview';
import DeviceQuickNav from '@/components/device/DeviceQuickNav';
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
        eyebrow="CPE / device center"
        title="设备信息"
        description="聚合设备身份、蜂窝状态、拓扑、能力和在线终端接口。"
        icon={<Router className="h-6 w-6" />}
        actions={
          <RefreshButton onClick={() => { void refreshDevicePage(); }} />
        }
      />

      {deviceError ? <Callout tone="danger">{deviceError}</Callout> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <DeviceQuickNav />

        <div className="min-w-0 space-y-5">
          {info ? (
            <>
              <section id="device-overview" className="scroll-mt-32 space-y-5">
                <DeviceIdentityHero info={info} cell={cell} />
                <CapabilitySummaryRow
                  vendor={vendor}
                  deviceName={info.DeviceName}
                  wlanDbho={wlanDbho}
                  topology={topology}
                />
              </section>

              <section id="device-signal" className="scroll-mt-32">
                <SignalMetricsOverview cell={cell} />
              </section>

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
        </div>
      </div>

      <DeviceDetailDialog
        device={selectedDevice}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </PageShell>
  );
}
