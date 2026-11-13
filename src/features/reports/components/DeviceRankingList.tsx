import { formatBytes } from '@/lib/format';
import type { DeviceRanking } from '@/types';

export function DeviceRankingList({ devices }: { devices: DeviceRanking[] }) {
  if (devices.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">暂无设备数据</p>;
  }
  const maxTotal = Math.max(...devices.map((device) => device.totalBytes));
  return (
    <div className="space-y-3">
      {devices.slice(0, 10).map((device, index) => {
        const percentage = maxTotal > 0 ? Math.round((device.totalBytes / maxTotal) * 100) : 0;
        return (
          <div key={device.mac || index} className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex min-w-0 items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" title={device.name}>{device.name}</p>
                  {device.ip ? (
                    <p className="truncate text-[11px] tabular-nums text-muted-foreground" title={device.ip}>{device.ip}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
                  {formatBytes(device.totalBytes)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand/70 to-primary transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
