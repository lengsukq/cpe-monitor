import { Clock3, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SchedulerCardProps {
  enabled: boolean;
  interval: number;
  running: boolean;
  saving: boolean;
  onToggle: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
}

export default function SchedulerCard({
  enabled,
  interval,
  running,
  saving,
  onToggle,
  onIntervalChange,
}: SchedulerCardProps) {
  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-warning" />
            定时监控
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">采集流量、设备数和信号，并触发告警</p>
        </div>
        <Switch
          checked={enabled}
          disabled={saving}
          onCheckedChange={onToggle}
          aria-label="启用定时监控"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">采集频率</p>
            <p className="text-xs text-muted-foreground">
              后台任务 {running ? '正在运行' : '尚未运行'}
            </p>
          </div>
          <Select
            value={String(interval || 60)}
            onValueChange={(value) => onIntervalChange(Number(value))}
          >
            <SelectTrigger className="w-full sm:w-auto sm:min-w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[5, 15, 30, 60].map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>每 {minutes} 分钟</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" />
          告警规则按静默期去重，通知渠道在“设置”中配置
        </div>
      </CardContent>
    </Card>
  );
}
