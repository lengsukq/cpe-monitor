'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import {
  formatLocalTime,
  getSignalQuality,
  getUpdateStateLabel,
} from '@/lib/format';
import type {
  DashboardOverviewResponse,
  DataPlanConfig,
  SmsSyncStatusView,
  TrafficStatsResponse,
} from '@/types';

export interface TrafficHistoryPoint {
  timestamp: string;
  uploadBytes?: number;
  downloadBytes?: number;
  uploadBps?: number;
  downloadBps?: number;
  connectedDevices?: number;
  signalStrength?: number;
  networkType?: string | null;
  band?: string | null;
  cellId?: string | null;
  pci?: string | null;
  rsrp?: number | null;
  rsrq?: number | null;
  sinr?: number | null;
  rssi?: number | null;
}

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

function getSnapshotValue(source: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    if (source?.[key]) return String(source[key]);
  }
  return '-';
}

export function useDashboardData() {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [trafficHistory, setTrafficHistory] = useState<TrafficHistoryPoint[]>([]);
  const [liveMetricHistory, setLiveMetricHistory] = useState<TrafficHistoryPoint[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [trafficStats, setTrafficStats] = useState<TrafficStatsResponse | null>(null);
  const [unit, setUnit] = useState<'MB' | 'GB'>('GB');
  const [startDate, setStartDate] = useState<DataPlanConfig | null>(null);
  const [overviewError, setOverviewError] = useState('');
  const [dataError, setDataError] = useState('');
  const [deviceSnapshot, setDeviceSnapshot] = useState<DeviceSnapshot | null>(null);
  const [smsSync, setSmsSync] = useState<SmsSyncStatusView | null>(null);
  const [schedulerSaving, setSchedulerSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  async function fetchOverview(): Promise<DashboardOverviewResponse | null> {
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
  }

  async function fetchTrafficHistory(range = timeRange) {
    try {
      const data = await apiFetch<TrafficHistoryPoint[]>(
        `/api/dashboard/traffic?range=${range}`,
        undefined,
        '获取流量历史失败',
      );
      setTrafficHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchTrafficStats(): Promise<TrafficStatsResponse | null> {
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
  }

  async function fetchLiveMetrics() {
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
      uploadBps: Number.isFinite(uploadBytesPerSecond)
        ? uploadBytesPerSecond * 8
        : 0,
      downloadBps: Number.isFinite(downloadBytesPerSecond)
        ? downloadBytesPerSecond * 8
        : 0,
      connectedDevices: overviewResult?.connectedDevices,
      signalStrength: overviewResult?.signalStrength,
      rsrp: overviewResult?.signalStrength,
      networkType: overviewResult?.networkType || null,
    };

    setLiveMetricHistory((current) => [...current.slice(-71), point]);
  }

  async function fetchStartDate() {
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
  }

  async function fetchDeviceSnapshot() {
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
  }

  async function fetchSmsSyncStatus() {
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
  }

  async function refreshDashboard() {
    setRefreshing(true);
    await Promise.allSettled([
      fetchLiveMetrics(),
      fetchTrafficHistory(),
      fetchStartDate(),
      fetchDeviceSnapshot(),
      fetchSmsSyncStatus(),
    ]);
    setRefreshing(false);
  }

  async function updateScheduler(
    enabled: boolean,
    interval = overview?.schedulerStatus?.interval || 60,
  ) {
    setSchedulerSaving(true);
    try {
      const data = await apiFetch<{ status?: DashboardOverviewResponse['schedulerStatus'] }>(
        '/api/dashboard/scheduler',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled, interval }),
        },
        '调度设置保存失败',
      );
      setOverview((current) => (
        current
          ? {
              ...current,
              schedulerStatus: data.status || {
                enabled,
                interval,
                running: enabled,
              },
            }
          : current
      ));
    } catch (error) {
      console.error(error);
    } finally {
      setSchedulerSaving(false);
    }
  }

  async function collectNow() {
    setCollecting(true);
    try {
      const result = await apiFetch<{
        success: boolean;
        collectedDevices: number;
        alertsTriggered: number;
        error?: string;
        trafficSnapshot: {
          uploadBytes: number;
          downloadBytes: number;
          signalStrength: number;
          collectedAt: string;
        } | null;
        trafficDelta: {
          uploadBytes: number;
          downloadBytes: number;
        } | null;
        topDevices: {
          name: string;
          uploadBytes: number;
          downloadBytes: number;
        }[];
        collectedAt: string;
      }>(
        '/api/dashboard/collect',
        { method: 'POST' },
        '立即采集失败',
      );
      return result;
    } catch (error) {
      console.error('Manual collection failed', error);
      throw error;
    } finally {
      setCollecting(false);
    }
  }

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      void fetchLiveMetrics();
      void fetchTrafficHistory();
      void fetchStartDate();
      void fetchDeviceSnapshot();
      void fetchSmsSyncStatus();
    }, 0);

    const intervalId = window.setInterval(() => {
      void fetchLiveMetrics();
    }, 5000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTrafficHistory(timeRange);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const signalQuality = overview ? getSignalQuality(overview.signalStrength) : null;
  const rate = trafficStats || {};
  const isConnected = overview?.connectionStatus === '901';
  const updateLabel = getUpdateStateLabel(overview?.updateState);
  const cell = deviceSnapshot?.cellInformation || {};
  const deviceName = getSnapshotValue(
    deviceSnapshot?.deviceInformation,
    ['DeviceName', 'spreadname_zh', 'spreadname_en'],
  );
  const smsSyncLabel = smsSync?.enabled ? `每 ${smsSync.interval} 分钟` : '已暂停';
  const smsSyncDetail = smsSync?.lastError
    ? '最近同步失败'
    : smsSync?.lastSyncedAt
      ? `最近同步 ${formatLocalTime(new Date(smsSync.lastSyncedAt))}`
      : '尚未同步';
  const schedulerStatusLabel = overview?.schedulerStatus?.running
    ? '运行中'
    : overview?.schedulerStatus?.enabled
      ? `每 ${overview.schedulerStatus.interval} 分钟`
      : '未启用';
  const metricHistory = liveMetricHistory.length >= 2
    ? liveMetricHistory
    : trafficHistory;

  return {
    overview,
    trafficHistory,
    metricHistory,
    timeRange,
    setTimeRange,
    loading,
    trafficStats,
    unit,
    setUnit,
    startDate,
    overviewError,
    dataError,
    deviceSnapshot,
    smsSync,
    schedulerSaving,
    refreshing,
    lastRefreshAt,
    signalQuality,
    rate,
    isConnected,
    updateLabel,
    cell,
    deviceName,
    smsSyncLabel,
    smsSyncDetail,
    schedulerStatusLabel,
    refreshDashboard,
    updateScheduler,
    collecting,
    collectNow,
  };
}
