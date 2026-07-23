'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { OnlineDeviceRow } from '@/components/device/OnlineDevicesTable';
import type { CpeDevicePageResponse } from '@/types/cpe';

export type DevicePageData = CpeDevicePageResponse;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
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

  const fetchDeviceInfo = useCallback(async () => {
    try {
      for (let attempt = 0; attempt <= 2; attempt += 1) {
        const data = await apiFetch<DevicePageData>(
          '/api/dashboard/device',
          undefined,
          '获取设备信息失败',
        );
        if (data.deviceInformation?.DeviceName) {
          setDeviceInfo(data);
          if (data.source === 'database') {
            setDeviceError(
              data.cpeError
                ? `CPE 暂不可用，已显示本地缓存：${data.cpeError}`
                : 'CPE 暂不可用，已显示本地缓存设备信息',
            );
          } else {
            setDeviceError('');
          }
          return;
        }
        if (attempt < 2) {
          setDeviceError('CPE 身份信息暂未返回，正在自动重试…');
          await wait(1000);
        }
      }
      throw new Error('CPE 未返回设备身份信息，请点击刷新重试');
    } catch (error) {
      console.error(error);
      setDeviceError(error instanceof Error ? error.message : '无法获取设备信息');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnectedDevices = useCallback(async () => {
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
  }, []);

  const refreshDevicePage = useCallback(async () => {
    // The CPE exposes one shared web session. Fetch identity first so the
    // HostInfo request cannot make an in-flight identity response incomplete.
    await fetchDeviceInfo();
    await fetchConnectedDevices();
  }, [fetchConnectedDevices, fetchDeviceInfo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshDevicePage();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshDevicePage]);

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
