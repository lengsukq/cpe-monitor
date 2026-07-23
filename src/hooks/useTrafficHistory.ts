'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';

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

export function useTrafficHistory() {
  const [trafficHistory, setTrafficHistory] = useState<TrafficHistoryPoint[]>([]);
  const [timeRange, setTimeRange] = useState('24h');

  const fetchTrafficHistory = useCallback(async (range = timeRange) => {
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
  }, [timeRange]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTrafficHistory(timeRange);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [timeRange, fetchTrafficHistory]);

  return {
    trafficHistory,
    timeRange,
    setTimeRange,
    fetchTrafficHistory,
  };
}
