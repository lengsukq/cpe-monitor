'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { bytesPerSecondToBitsPerSecond } from '@/lib/traffic-units';
import type {
  DashboardOverviewResponse,
  DataPlanConfig,
  SmsSyncStatusView,
  TrafficStatsResponse,
} from '@/types';
import type { TrafficHistoryPoint } from './useTrafficHistory';

export interface DeviceSnapshot {
  deviceInformation?: Record<string, unknown>;
  cellInformation?: {
    cellId?: string;
    networkType?: string;
    carrier?: string;
    band?: string;
    pci?: string | number;
    rsrp?: string | number;
    rsrq?: string | number;
    sinr?: string | number;
  };
}

const LIVE_METRIC_INTERVAL_MS = 5000;
const MAX_LIVE_POINTS = 72;

export function useLiveMetrics() {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [liveMetricHistory, setLiveMetricHistory] = useState<TrafficHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [trafficStats, setTrafficStats] = useState<TrafficStatsResponse | null>(null);
  const [startDate, setStartDate] = useState<DataPlanConfig | null>(null);
  const [overviewError, setOverviewError] = useState('');
  const [dataError, setDataError] = useState('');
  const [deviceSnapshot, setDeviceSnapshot] = useState<DeviceSnapshot | null>(null);
  const [smsSync, setSmsSync] = useState<SmsSyncStatusView | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const fetchOverview = useCallback(async (): Promise<DashboardOverviewResponse | null> => {
    try {
      const data = await apiFetch<DashboardOverviewResponse>(
        '/api/dashboard/overview',
        undefined,
        '获取概览失败',
      );
      setOverview(data);
      setOverviewError(data.cpeError || '');
      setLastRefreshAt(new Date());
      return data;
    } catch (error) {
      console.error(error);
      setOverviewError(
        error instanceof Error ? error.message : '无法获取实时状态，正在显示兜底数据',
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrafficStats = useCallback(async (): Promise<TrafficStatsResponse | null> => {
    try {
      const data = await apiFetch<TrafficStatsResponse>(
        '/api/dashboard/traffic-stats',
        undefined,
        '获取流量统计失败',
      );
      setTrafficStats(data);
      setDataError('');
      return data;
    } catch (error) {
      console.error(error);
      setDataError(
        error instanceof Error ? error.message : 'CPE 登录失败，无法获取流量统计。',
      );
      return null;
    }
  }, []);

  const fetchStartDate = useCallback(async () => {
    try {
      const data = await apiFetch<DataPlanConfig>(
        '/api/dashboard/start-date',
        undefined,
        '获取套餐配置失败',
      );
      setStartDate(data);
    } catch (error) {
      console.error(error);
      setDataError(
        error instanceof Error ? error.message : 'CPE 登录失败，无法获取套餐配置。',
      );
    }
  }, []);

  const fetchDeviceSnapshot = useCallback(async () => {
    try {
      const data = await apiFetch<DeviceSnapshot>(
        '/api/dashboard/device',
        undefined,
        '获取设备快照失败',
      );
      setDeviceSnapshot(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchSmsSyncStatus = useCallback(async () => {
    try {
      const data = await apiFetch<SmsSyncStatusView>(
        '/api/dashboard/sms/settings',
        undefined,
        '获取短信同步状态失败',
      );
      setSmsSync(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchLiveMetrics = useCallback(async () => {
    const [overviewResult, trafficResult] = await Promise.all([
      fetchOverview(),
      fetchTrafficStats(),
    ]);

    if (!overviewResult && !trafficResult) return;

    const uploadBytesPerSecond = Number.parseFloat(
      String(trafficResult?.CurrentUploadRate || '0'),
    );
    const downloadBytesPerSecond = Number.parseFloat(
      String(trafficResult?.CurrentDownloadRate || '0'),
    );

    const point: TrafficHistoryPoint = {
      timestamp: new Date().toISOString(),
      uploadBps: bytesPerSecondToBitsPerSecond(uploadBytesPerSecond),
      downloadBps: bytesPerSecondToBitsPerSecond(downloadBytesPerSecond),
      connectedDevices: overviewResult?.connectedDevices,
      signalStrength: overviewResult?.signalStrength,
      rsrp: overviewResult?.signalStrength,
      networkType: overviewResult?.networkType || null,
    };

    setLiveMetricHistory((current) => [...current.slice(-(MAX_LIVE_POINTS - 1)), point]);
  }, [fetchOverview, fetchTrafficStats]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      fetchLiveMetrics(),
      fetchStartDate(),
      fetchDeviceSnapshot(),
      fetchSmsSyncStatus(),
    ]);
  }, [fetchLiveMetrics, fetchStartDate, fetchDeviceSnapshot, fetchSmsSyncStatus]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void fetchLiveMetrics();
      void fetchStartDate();
      void fetchDeviceSnapshot();
      void fetchSmsSyncStatus();
    }, 0);

    const intervalId = window.setInterval(() => {
      void fetchLiveMetrics();
    }, LIVE_METRIC_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
    };
  }, [fetchLiveMetrics, fetchStartDate, fetchDeviceSnapshot, fetchSmsSyncStatus]);

  return {
    overview,
    setOverview,
    liveMetricHistory,
    loading,
    trafficStats,
    startDate,
    overviewError,
    dataError,
    deviceSnapshot,
    smsSync,
    lastRefreshAt,
    refreshAll,
  };
}
