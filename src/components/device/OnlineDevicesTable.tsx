import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Callout from '@/components/Callout';
import TableSkeleton from '@/components/TableSkeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatBytesFromString, formatDurationFromString } from '@/lib/format';

export interface OnlineDeviceRow {
  HostName?: string;
  IPAddress?: string;
  MACAddress?: string;
  Frequency?: string;
  RxKBytes?: string;
  TxKBytes?: string;
  AssociatedTime?: string;
  Active?: boolean;
  [key: string]: unknown;
}

interface OnlineDevicesTableProps {
  devices: OnlineDeviceRow[];
  loading: boolean;
  error?: string;
  onSelect: (device: OnlineDeviceRow) => void;
}

export default function OnlineDevicesTable({
  devices,
  loading,
  error,
  onSelect,
}: OnlineDevicesTableProps) {
  return (
    <Card id="online-devices" className="card-hover scroll-mt-24">
      <CardHeader>
        <CardTitle>在线设备</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-4"><Callout tone="danger">{error}</Callout></div> : null}
        {loading ? (
          <TableSkeleton rows={3} />
        ) : devices.length > 0 ? (
          <>
            <div className="space-y-3 md:hidden">
              {devices.map((device, index) => (
                <button
                  key={device.MACAddress || index}
                  type="button"
                  onClick={() => onSelect(device)}
                  className="w-full rounded-2xl border border-border/70 bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{device.HostName || '未知设备'}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {device.IPAddress || '-'}
                      </p>
                    </div>
                    <Badge variant={device.Active ? 'default' : 'secondary'}>
                      {device.Active ? '在线' : '离线'}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>频段：{device.Frequency || '-'}</span>
                    <span>时长：{formatDurationFromString(device.AssociatedTime)}</span>
                    <span>下行：{formatBytesFromString(device.RxKBytes, true)}</span>
                    <span>上行：{formatBytesFromString(device.TxKBytes, true)}</span>
                  </div>
                  <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                    {device.MACAddress || '-'}
                  </p>
                </button>
              ))}
            </div>

            <div className="hidden md:block">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>设备名称</TableHead>
                    <TableHead>IP 地址</TableHead>
                    <TableHead>MAC 地址</TableHead>
                    <TableHead>频段</TableHead>
                    <TableHead className="text-right">下行流量</TableHead>
                    <TableHead className="text-right">上行流量</TableHead>
                    <TableHead className="text-right">在线时长</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device, index) => (
                    <TableRow
                      key={device.MACAddress || index}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => onSelect(device)}
                    >
                      <TableCell className="font-medium">{device.HostName || '未知设备'}</TableCell>
                      <TableCell className="font-mono text-sm">{device.IPAddress}</TableCell>
                      <TableCell className="font-mono text-sm">{device.MACAddress}</TableCell>
                      <TableCell>{device.Frequency || '-'}</TableCell>
                      <TableCell className="text-right">{formatBytesFromString(device.RxKBytes, true)}</TableCell>
                      <TableCell className="text-right">{formatBytesFromString(device.TxKBytes, true)}</TableCell>
                      <TableCell className="text-right">{formatDurationFromString(device.AssociatedTime)}</TableCell>
                      <TableCell>
                        <Badge variant={device.Active ? 'default' : 'secondary'}>
                          {device.Active ? '在线' : '离线'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-muted-foreground">暂无在线设备</p>
        )}
      </CardContent>
    </Card>
  );
}
