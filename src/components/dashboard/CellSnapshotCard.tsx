import { Radio } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import InfoField from '@/components/InfoField';
import { getCarrier } from '@/lib/format';

interface CellSnapshotCardProps {
  networkType?: string;
  connectionStatus?: string;
  deviceName?: string;
  carrierCode?: string;
  cell?: {
    carrier?: string;
    band?: string;
    cellId?: string;
    pci?: string | number;
    rsrp?: string | number;
    rsrq?: string | number;
    sinr?: string | number;
  };
}

export default function CellSnapshotCard({
  networkType,
  connectionStatus,
  deviceName,
  carrierCode,
  cell = {},
}: CellSnapshotCardProps) {
  return (
    <Card className="card-hover overflow-hidden border-brand/15 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--brand),transparent_84%),transparent_42%),linear-gradient(135deg,var(--card),var(--card))]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-brand" />
            当前小区
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">实时蜂窝注册信息与 CPE 身份</p>
        </div>
        <Badge variant="outline" className="rounded-full">
          {networkType && networkType !== 'unknown' ? networkType : '等待数据'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
          <InfoField size="sm" label="设备型号" value={deviceName} />
          <InfoField size="sm" label="运营商" value={cell.carrier || getCarrier(String(carrierCode || ''))} />
          <InfoField size="sm" label="频段" value={cell.band} />
          <InfoField size="sm" label="小区 ID" value={cell.cellId} mono />
          <InfoField size="sm" label="PCI" value={cell.pci} />
          <InfoField size="sm" label="RSRP" value={cell.rsrp} />
          <InfoField size="sm" label="RSRQ" value={cell.rsrq} />
          <InfoField size="sm" label="SINR" value={cell.sinr} />
          <InfoField
            size="sm"
            label="当前状态"
            value={connectionStatus === '901' ? '已连接' : '未连接/未知'}
          />
        </div>
      </CardContent>
    </Card>
  );
}
