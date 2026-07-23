'use client';

import { useCallback, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { DashboardOverviewResponse } from '@/types';

export function useSchedulerControl(
  overview: DashboardOverviewResponse | null,
  setOverview: React.Dispatch<React.SetStateAction<DashboardOverviewResponse | null>>,
) {
  const [schedulerSaving, setSchedulerSaving] = useState(false);

  const updateScheduler = useCallback(async (
    enabled: boolean,
    interval = overview?.schedulerStatus?.interval || 60,
  ) => {
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
  }, [overview?.schedulerStatus?.interval, setOverview]);

  return { schedulerSaving, updateScheduler };
}
