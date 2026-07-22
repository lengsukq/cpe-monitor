'use client';

import { useEffect, useState } from 'react';
import { Activity, Download, Signal, Upload } from 'lucide-react';
import { apiFetch } from '@/lib/client-api';
import { formatBytes, formatRate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import TrafficChart from '@/components/TrafficChart';

interface DeviceHistoryPoint {
  timestamp: string;
  uploadBytes: number;
  downloadBytes: number;
  uploadBps: number;
  downloadBps: number;
  rssi: number | null;
}

interface DeviceHistoryResponse {
  mac: string;
  range: string;
  points: DeviceHistoryPoint[];
  summary: {
    sampleCount: number;
    totalUploadBytes: number;
    totalDownloadBytes: number;
    peakUploadBps: number;
    peakDownloadBps: number;
    averageRssi: number | null;
  };
}

interface DeviceHistoryPanelProps {
  mac: string;
}

const ranges = ['1h', '6h', '24h', '7d'] as const;

export default function DeviceHistoryPanel({ mac }: DeviceHistoryPanelProps) {
  const [range, setRange] = useState<(typeof ranges)[number]>('24h');
  const [data, setData] = useState<DeviceHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void apiFetch<DeviceHistoryResponse>(
      `/api/dashboard/devices/history?mac=${encodeURIComponent(mac)}&range=${range}`,
      undefined,
      '获取设备历史失败',
    ).then((response) => {
      if (cancelled) return;
      setData(response);
      setError('');
    }).catch((requestError) => {
      if (cancelled) return;
      setError(requestError instanceof Error ? requestError.message : '获取设备历史失败');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [mac, range]);

  function changeRange(nextRange: (typeof ranges)[number]) {
    if (nextRange === range) return;
    setLoading(true);
    setRange(nextRange);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-medium">历史使用情况</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            基于相邻采集点计算设备区间流量和平均速率。
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ranges.map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={range === item ? 'default' : 'outline'}
              onClick={() => changeRange(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="fluid-card-grid gap-3 [--fluid-card-min:9rem]">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-xl" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : !data || data.points.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
          暂无该设备的历史采样；完成新的流量采集后会在这里显示。
        </div>
      ) : (
        <>
          <div className="fluid-card-grid gap-3 [--fluid-card-min:9rem]">
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <Download className="h-4 w-4 text-brand" />
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {formatBytes(data.summary.totalDownloadBytes)}
              </p>
              <p className="text-xs text-muted-foreground">区间下载</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <Upload className="h-4 w-4 text-info" />
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {formatBytes(data.summary.totalUploadBytes)}
              </p>
              <p className="text-xs text-muted-foreground">区间上传</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <Activity className="h-4 w-4 text-success" />
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {formatRate(data.summary.peakDownloadBps / 8)}
              </p>
              <p className="text-xs text-muted-foreground">下载峰值</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-3">
              <Signal className="h-4 w-4 text-warning" />
              <p className="mt-2 text-lg font-semibold tabular-nums">
                {data.summary.averageRssi === null
                  ? '—'
                  : `${data.summary.averageRssi.toFixed(1)} dBm`}
              </p>
              <p className="text-xs text-muted-foreground">平均 RSSI</p>
            </div>
          </div>
          <div className="h-52 sm:h-60">
            <TrafficChart data={data.points} />
          </div>
          <p className="text-right text-xs text-muted-foreground">
            共 {data.summary.sampleCount} 个采样点
          </p>
        </>
      )}
    </section>
  );
}
