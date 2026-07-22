import { Activity, DatabaseZap, RefreshCw, Wifi } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import StatusPill from '@/components/dashboard/StatusPill';

interface StatusPillsRowProps {
  isConnected: boolean;
  updateLabel: string;
  updateState?: string;
  schedulerLabel: string;
  schedulerRunning: boolean;
  collectionHealthLabel: string;
  collectionHealthStatus: 'healthy' | 'failed' | 'stale' | 'never' | 'disabled';
}

export default function StatusPillsRow({
  isConnected,
  updateLabel,
  updateState,
  schedulerLabel,
  schedulerRunning,
  collectionHealthLabel,
  collectionHealthStatus,
}: StatusPillsRowProps) {
  const collectionTone = collectionHealthStatus === 'healthy'
    ? 'success'
    : collectionHealthStatus === 'failed'
      ? 'danger'
      : collectionHealthStatus === 'stale'
        ? 'warning'
        : 'muted';

  return (
    <Card className="card-hover bg-gradient-to-br from-card/90 to-card/50">
      <CardContent className="fluid-card-grid gap-2 p-3 [--fluid-card-min:13rem] sm:gap-3 sm:p-4">
        <StatusPill
          icon={<Wifi className="h-4 w-4" />}
          label="蜂窝连接"
          value={isConnected ? '已连接' : '未连接/未知'}
          tone={isConnected ? 'success' : 'muted'}
        />
        <StatusPill
          icon={<RefreshCw className="h-4 w-4" />}
          label="升级状态"
          value={updateLabel}
          tone={updateState === 'unknown' ? 'muted' : 'info'}
        />
        <StatusPill
          icon={<Activity className="h-4 w-4" />}
          label="定时采集"
          value={schedulerLabel}
          tone={schedulerRunning ? 'success' : 'muted'}
        />
        <StatusPill
          icon={<DatabaseZap className="h-4 w-4" />}
          label="采集健康"
          value={collectionHealthLabel}
          tone={collectionTone}
        />
      </CardContent>
    </Card>
  );
}
