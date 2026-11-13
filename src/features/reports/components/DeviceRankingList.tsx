import { formatBytes } from '@/lib/format';
import type { DeviceRanking } from '@/types';

export function DeviceRankingList({ devices }: { devices: DeviceRanking[] }) {
  if (devices.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">暂无设备数据</p>;
  }
  const maxTotal = Math.max(...devices.map((device) => device.totalBytes));
  return (
    <div className="space-y-2.5">
      {devices.slice(0, 10).map((device, index) => {
        const percentage = maxTotal > 0 ? Math.round((device.totalBytes / maxTotal) * 100) : 0;
        return (
          <div key={device.mac || index} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3">
            <span className="pt-0.5 text-center text-xs font-medium text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 space-y-1.5">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-muted-foreground" title={device.name}>{device.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground/60" title={device.ip}>{device.ip}</p>
                </div>
                <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {formatBytes(device.totalBytes)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
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
