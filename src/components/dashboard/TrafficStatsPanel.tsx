import { ChartNoAxesCombined } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import InfoField from '@/components/InfoField';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { formatDuration, formatWithUnit } from '@/lib/format';
import type { TrafficStatsResponse } from '@/types';

interface TrafficStatsPanelProps {
  trafficStats: TrafficStatsResponse | null;
  unit: 'MB' | 'GB';
  onUnitChange: (unit: 'MB' | 'GB') => void;
}

export default function TrafficStatsPanel({
  trafficStats,
  unit,
  onUnitChange,
}: TrafficStatsPanelProps) {
  const rate = trafficStats || {};

  return (
    <Card className="card-hover py-4 sm:py-5">
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="metric-icon size-8 rounded-xl sm:size-9"><ChartNoAxesCombined className="h-4 w-4" /></span>
            流量统计
          </CardTitle>
          <div className="flex items-center gap-2">
            <ExportCsvButton href="/api/export/traffic" />
            <div className="flex gap-1">
            <Button size="sm" variant={unit === 'MB' ? 'default' : 'outline'} onClick={() => onUnitChange('MB')}>
              MB
            </Button>
            <Button size="sm" variant={unit === 'GB' ? 'default' : 'outline'} onClick={() => onUnitChange('GB')}>
              GB
            </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {trafficStats ? (
          <div className="grid grid-cols-2 gap-3 sm:fluid-card-grid sm:[--fluid-card-min:14rem]">
            <InfoField label="本次下载" value={formatWithUnit(parseInt(String(rate.CurrentDownload || '0'), 10), unit)} />
            <InfoField label="本次上传" value={formatWithUnit(parseInt(String(rate.CurrentUpload || '0'), 10), unit)} />
            <InfoField label="累计下载" value={formatWithUnit(parseInt(String(rate.TotalDownload || '0'), 10), unit)} />
            <InfoField label="累计上传" value={formatWithUnit(parseInt(String(rate.TotalUpload || '0'), 10), unit)} />
            <InfoField label="本次连接" value={formatDuration(parseInt(String(rate.CurrentConnectTime || '0'), 10))} />
            <InfoField label="累计连接" value={formatDuration(parseInt(String(rate.TotalConnectTime || '0'), 10))} />
          </div>
        ) : (
          <Skeleton className="h-32" />
        )}
      </CardContent>
    </Card>
  );
}
