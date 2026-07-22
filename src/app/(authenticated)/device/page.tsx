'use client';

import { Activity, Cpu, RadioTower, Router, UsersRound } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Callout } from '@/components/Callout';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import {
  OverviewDonut,
  OverviewSegments,
} from '@/components/overview/OverviewMiniCharts';
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

function parseMetric(value: unknown): number | null {
  const match = String(value ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function getSignalScore(rsrp: number | null) {
  if (rsrp === null) return 0;
  return Math.min(100, Math.max(0, ((rsrp + 120) / 40) * 100));
}

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
  const connected = cell?.connectionStatus === '901';
  const signalValue = parseMetric(cell?.rsrp ?? cell?.signal?.nrrsrp);
  const signalScore = getSignalScore(signalValue);
  const maxWifiUsers = Number.parseInt(String(cell?.status?.TotalWifiUser || '0'), 10);
  const accessDistribution = rawDevices.reduce<Record<string, number>>((result, device) => {
    const frequency = String(device.Frequency || '').toLowerCase();
    const interfaceType = String(device.InterfaceType || '').toLowerCase();
    const label = interfaceType.includes('ethernet') || interfaceType.includes('wired')
      ? '有线'
      : frequency.includes('2.4') || frequency === '2g'
        ? '2.4G'
        : frequency.includes('5')
          ? '5G Wi-Fi'
          : '其他';
    result[label] = (result[label] || 0) + 1;
    return result;
  }, {});

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

      <PageOverview
        eyebrow={<><Router className="h-3.5 w-3.5" />Device / live status</>}
        title="设备运行概览"
        description="先查看连接、终端和射频状态，再通过左侧导航进入详细参数。"
        items={[
          {
            label: '蜂窝连接',
            value: connected ? '已连接' : '未连接',
            detail: cell?.networkType || '网络制式未知',
            icon: <RadioTower className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={connected ? 1 : 0}
                total={1}
                centerLabel={connected ? '在线' : '离线'}
                label="蜂窝连接状态"
                className={connected ? 'text-success' : 'text-danger'}
              />
            ),
          },
          {
            label: '在线终端',
            value: `${rawDevices.length} 台`,
            detail: maxWifiUsers > 0 ? `最大容量 ${maxWifiUsers} 台` : '点击查看终端列表',
            icon: <UsersRound className="h-3.5 w-3.5" />,
            href: '#online-devices',
            chart: (
              <OverviewDonut
                value={rawDevices.length}
                total={Math.max(maxWifiUsers, rawDevices.length, 1)}
                label="在线终端容量占用"
                className="text-info"
              />
            ),
          },
          {
            label: '信号评分',
            value: signalValue === null ? '—' : `${signalValue} dBm`,
            detail: signalScore >= 75 ? '信号良好' : signalScore >= 45 ? '信号一般' : '建议优化摆放位置',
            icon: <Activity className="h-3.5 w-3.5" />,
            href: '#device-signal',
            chart: (
              <OverviewDonut
                value={signalScore}
                total={100}
                label="RSRP 信号评分"
                className={signalScore >= 75 ? 'text-success' : signalScore >= 45 ? 'text-warning' : 'text-danger'}
              />
            ),
          },
          {
            label: '接入方式',
            value: `${Object.keys(accessDistribution).length} 类`,
            detail: info?.DeviceName || vendor || 'CPE 设备',
            icon: <Cpu className="h-3.5 w-3.5" />,
            chart: (
              <OverviewSegments
                segments={Object.entries(accessDistribution).map(([label, value]) => ({ label, value }))}
                label="在线终端接入方式分布"
              />
            ),
          },
        ]}
      />

      <div className="fluid-sidebar-grid gap-5">
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
