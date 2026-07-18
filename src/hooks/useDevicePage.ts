'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { OnlineDeviceRow } from '@/components/device/OnlineDevicesTable';

export interface DevicePageData {
  deviceInformation?: Record<string, any>;
  deviceInfo?: Record<string, any>;
  onlineState?: Record<string, any>;
  cellInformation?: Record<string, any>;
  vendorName?: unknown;
  wlanDbho?: unknown;
  topology?: unknown;
  devCapacity?: unknown;
  portalSettings?: unknown;
  iocDeviceCapacity?: unknown;
}

export function useDevicePage() {
  const [deviceInfo, setDeviceInfo] = useState<DevicePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawDevices, setRawDevices] = useState<OnlineDeviceRow[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<OnlineDeviceRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [devicesError, setDevicesError] = useState('');

  async function fetchDeviceInfo(attempt = 0) {
    let retryScheduled = false;
    try {
      const data = await apiFetch<DevicePageData>(
        '/api/dashboard/device',
        undefined,
        '获取设备信息失败',
      );
      if (!data.deviceInformation?.DeviceName) {
        if (attempt < 2) {
          retryScheduled = true;
          setDeviceError('CPE 身份信息暂未返回，正在自动重试…');
          window.setTimeout(() => { void fetchDeviceInfo(attempt + 1); }, 1000);
          return;
        }
        throw new Error('CPE 未返回设备身份信息，请点击刷新重试');
      }
      setDeviceInfo(data);
      setDeviceError('');
    } catch (error) {
      console.error(error);
      setDeviceError(error instanceof Error ? error.message : '无法获取设备信息');
    } finally {
      if (!retryScheduled) setLoading(false);
    }
  }

  async function fetchConnectedDevices() {
    try {
      const data = await apiFetch<{ devices?: OnlineDeviceRow[] }>(
        '/api/dashboard/devices',
        undefined,
        '获取在线设备失败',
      );
      setRawDevices(data.devices || []);
      setDevicesError('');
    } catch (error) {
      console.error(error);
      setDevicesError(
        error instanceof Error ? error.message : 'CPE 登录失败，无法获取在线设备列表。',
      );
    } finally {
      setDevicesLoading(false);
    }
  }

  async function refreshDevicePage() {
    // The CPE exposes one shared web session. Fetch identity first so the
    // HostInfo request cannot make an in-flight identity response incomplete.
    await fetchDeviceInfo();
    await fetchConnectedDevices();
  }

  useEffect(() => {
    void refreshDevicePage();
  }, []);

  useEffect(() => {
    if (loading || window.location.hash !== '#online-devices') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('online-devices')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading]);

  return {
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
  };
}
