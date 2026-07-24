'use client';

import { useCallback, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { formatLocalTime, getSignalQuality, getUpdateStateLabel } from '@/lib/format';
import { useTrafficHistory } from './useTrafficHistory';
import { useLiveMetrics } from './useLiveMetrics';
import { useSchedulerControl } from './useSchedulerControl';

export type { TrafficHistoryPoint } from './useTrafficHistory';
export type { DeviceSnapshot } from './useLiveMetrics';

function getSnapshotValue(source: Record<string, unknown> | undefined, keys: string[]) {
  for (const key of keys) {
    if (source?.[key]) return String(source[key]);
  }
  return '-';
}

export function useDashboardData() {
  const {
    trafficHistory,
    timeRange,
    setTimeRange,
    fetchTrafficHistory,
  } = useTrafficHistory();

  const {
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
    sseStatus,
  } = useLiveMetrics();

  const { schedulerSaving, updateScheduler } = useSchedulerControl(overview, setOverview);

  const [unit, setUnit] = useState<'MB' | 'GB'>('GB');
  const [refreshing, setRefreshing] = useState(false);
  const [collecting, setCollecting] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refreshAll(), fetchTrafficHistory()]);
    setRefreshing(false);
  }, [refreshAll, fetchTrafficHistory]);

  const collectNow = useCallback(async () => {
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
        trafficDelta: { uploadBytes: number; downloadBytes: number } | null;
        topDevices: { name: string; uploadBytes: number; downloadBytes: number }[];
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
  }, []);

  // ─── Derived state ────────────────────────────────────────────────────
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
    sseStatus,
  };
}
