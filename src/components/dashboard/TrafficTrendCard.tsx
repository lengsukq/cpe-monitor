import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TrafficChart from '@/components/TrafficChart';
import type { TrafficHistoryPoint } from '@/hooks/useDashboardData';

interface TrafficTrendCardProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  data: TrafficHistoryPoint[];
}

export default function TrafficTrendCard({
  timeRange,
  onTimeRangeChange,
  data,
}: TrafficTrendCardProps) {
  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">流量趋势</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              根据相邻采集点的增量计算平均上下行速率，不直接使用累计计数器。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['1h', '6h', '24h', '7d', '30d'].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? 'default' : 'outline'}
                className="rounded-full px-3"
                onClick={() => onTimeRangeChange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80 xl:h-[360px]">
          <TrafficChart data={data} />
        </div>
      </CardContent>
    </Card>
  );
}
