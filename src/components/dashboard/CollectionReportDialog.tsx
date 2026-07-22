'use client';

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Signal,
  TrendingUp,
  Wifi,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatBytes, formatLocalTime } from '@/lib/format';

export interface CollectionReportData {
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
}

interface CollectionReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CollectionReportData | null;
}

function SignalMeter({ value }: { value: number }) {
  const bars = Math.min(5, Math.max(0, Math.round((value + 120) / 25)));
  return (
    <div className="flex items-end gap-[2px]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={`w-[4px] rounded-t-sm transition-colors ${
            index < bars
              ? index < 2
                ? 'bg-destructive'
                : index < 4
                  ? 'bg-warning'
                  : 'bg-success'
              : 'bg-muted-foreground/20'
          }`}
          style={{ height: `${6 + index * 3}px` }}
        />
      ))}
    </div>
  );
}

function SignalQualityText({ value }: { value: number }) {
  if (value >= -70) return <span className="text-success">优秀</span>;
  if (value >= -85) return <span className="text-success">良好</span>;
  if (value >= -100) return <span className="text-warning">一般</span>;
  return <span className="text-destructive">差</span>;
}

function MiniTrafficBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground" title={label}>
          {label}
        </span>
        <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatBytes(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CollectionReportDialog({
  open,
  onOpenChange,
  data,
}: CollectionReportDialogProps) {
  if (!data) return null;

  const totalTraffic = data.trafficDelta
    ? data.trafficDelta.uploadBytes + data.trafficDelta.downloadBytes
    : 0;
  const devicesWithTraffic = data.topDevices.filter(
    (d) => d.uploadBytes + d.downloadBytes > 0,
  );
  const maxDeviceTraffic = devicesWithTraffic.length > 0
    ? Math.max(...devicesWithTraffic.map((d) => d.uploadBytes + d.downloadBytes))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">采集报告</DialogTitle>
              <DialogDescription>
                {data.collectedAt
                  ? formatLocalTime(new Date(data.collectedAt))
                  : ''}
              </DialogDescription>
            </div>
          </div>
          <div className="mt-2">
            {data.success ? (
              <Badge
                variant="default"
                className="gap-1 rounded-full bg-success/10 px-3 py-1 text-success hover:bg-success/15"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                采集成功
              </Badge>
            ) : (
              <Badge
                variant="destructive"
                className="gap-1 rounded-full px-3 py-1"
              >
                <XCircle className="h-3.5 w-3.5" />
                采集失败
              </Badge>
            )}
          </div>
        </DialogHeader>

        {data.success ? (
          <div className="space-y-5">
            {/* Metric cards row */}
            <div className="fluid-card-grid gap-3 [--fluid-card-min:8rem]">
              <div className="rounded-lg border bg-card p-3 text-center">
                <Wifi className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <div className="text-2xl font-bold tabular-nums">
                  {data.collectedDevices}
                </div>
                <div className="text-xs text-muted-foreground">在线设备</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <TrendingUp className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <div className="text-2xl font-bold tabular-nums">
                  {formatBytes(totalTraffic)}
                </div>
                <div className="text-xs text-muted-foreground">本次新增流量</div>
                {data.trafficDelta && (
                  <div className="mt-0.5 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60">
                    <span>↑ {formatBytes(data.trafficDelta.uploadBytes)}</span>
                    <span>↓ {formatBytes(data.trafficDelta.downloadBytes)}</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <Signal className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-2xl font-bold tabular-nums">
                    {data.trafficSnapshot?.signalStrength ?? '--'}
                  </span>
                  <span className="text-xs text-muted-foreground">dBm</span>
                </div>
                <div className="mt-0.5 flex items-center justify-center gap-2">
                  {data.trafficSnapshot && (
                    <>
                      <SignalMeter value={data.trafficSnapshot.signalStrength} />
                      <SignalQualityText value={data.trafficSnapshot.signalStrength} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Top devices */}
            {data.topDevices.length > 0 && (
              <div className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  在线设备流量排行
                </div>
                {devicesWithTraffic.length > 0 ? (
                  <div className="space-y-2.5">
                    {devicesWithTraffic.map((device, index) => (
                      <MiniTrafficBar
                        key={`${device.name}-${index}`}
                        label={device.name}
                        value={device.uploadBytes + device.downloadBytes}
                        max={maxDeviceTraffic}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    CPE 未提供单设备流量数据，无法展示排行
                  </p>
                )}
              </div>
            )}

            {/* Alerts */}
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  告警状态
                </div>
                {data.alertsTriggered > 0 ? (
                  <Badge variant="destructive" className="gap-1 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    {data.alertsTriggered} 条触发
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 rounded-full text-muted-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    未触发告警
                  </Badge>
                )}
              </div>
              {data.alertsTriggered > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  有 {data.alertsTriggered} 条告警规则被触发，已根据通知配置发送通知。
                </p>
              )}
              {data.alertsTriggered === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  所有已启用的告警规则均未达到触发条件，网络状态正常。
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Error state */
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <XCircle className="mx-auto mb-3 h-10 w-10 text-destructive/60" />
            <p className="text-sm font-medium text-foreground">采集未完成</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.error || '未知错误'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
