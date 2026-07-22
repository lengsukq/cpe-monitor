import { RadioTower, UsersRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TrafficHistoryPoint } from '@/hooks/useDashboardData';
import DeviceCountHistoryChart from './DeviceCountHistoryChart';
import SignalHistoryChart from './SignalHistoryChart';

interface NetworkHistoryGridProps {
  data: TrafficHistoryPoint[];
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function NetworkHistoryGrid({ data }: NetworkHistoryGridProps) {
  const hasSignalData = data.some((entry) => (
    entry.rsrp !== null && entry.rsrp !== undefined
  ) || (
    entry.rsrq !== null && entry.rsrq !== undefined
  ) || (
    entry.sinr !== null && entry.sinr !== undefined
  ) || (
    entry.rssi !== null && entry.rssi !== undefined
  ));
  const hasDeviceData = data.some((entry) => (
    entry.connectedDevices !== null && entry.connectedDevices !== undefined
  ));

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="metric-icon size-9 rounded-xl text-warning"><RadioTower className="h-4 w-4" /></span>
            信号质量趋势
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            同时观察覆盖强度与链路质量，缺失采样点不会自动补零。
          </p>
        </CardHeader>
        <CardContent>
          {hasSignalData ? (
            <div className="h-64 sm:h-72">
              <SignalHistoryChart data={data} />
            </div>
          ) : (
            <EmptyChart message="新的采集记录开始保存 RSRP、RSRQ、SINR 和 RSSI；完成一次采集后即可显示趋势。" />
          )}
        </CardContent>
      </Card>

      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="metric-icon size-9 rounded-xl text-success"><UsersRound className="h-4 w-4" /></span>
            在线设备趋势
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            使用阶梯曲线展示采集时刻的在线终端数量变化。
          </p>
        </CardHeader>
        <CardContent>
          {hasDeviceData ? (
            <div className="h-64 sm:h-72">
              <DeviceCountHistoryChart data={data} />
            </div>
          ) : (
            <EmptyChart message="当前时间范围暂无在线设备历史数据。" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
