'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import DeviceHistoryPanel from '@/components/device/DeviceHistoryPanel';
import {
  formatBytesFromString,
  formatDurationFromString,
  getDeviceIcon,
} from '@/lib/format';

interface DeviceDetail {
  HostName?: string;
  IPAddress?: string;
  MACAddress?: string;
  Active?: boolean;
  UploadBytes?: string;
  DownloadBytes?: string;
  OnlineDuration?: string;
  IconType?: string;
  Frequency?: string;
  InterfaceType?: string;
  AddressSource?: string;
  AssociatedTime?: string;
  SignalStrength?: string;
  VendorClassID?: string;
  DeviceBrands?: string;
  TxKBytes?: string;
  RxKBytes?: string;
  UpRate?: string;
  DownRate?: string;
  rssi?: string | number;
  [key: string]: unknown;
}

interface DeviceDetailDialogProps {
  device: DeviceDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeviceDetailDialog({ device, open, onOpenChange }: DeviceDetailDialogProps) {
  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[min(52rem,calc(100%-2rem))] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 pr-8">
            <span className="text-2xl">{getDeviceIcon(device.IconType || "")}</span>
            <span className="min-w-0 break-all">{device.HostName || '未知设备'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 状态 */}
          <div className="flex items-center gap-2">
            <Badge variant={device.Active ? 'default' : 'secondary'}>
              {device.Active ? '在线' : '离线'}
            </Badge>
            {device.Frequency && (
              <Badge variant="outline">{device.Frequency}</Badge>
            )}
            {device.InterfaceType && (
              <Badge variant="outline">{device.InterfaceType === 'Wireless' ? '无线' : '有线'}</Badge>
            )}
          </div>

          <Separator />

          {/* 网络信息 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">IP 地址</p>
              <p className="break-all font-mono text-sm">{device.IPAddress || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">MAC 地址</p>
              <p className="break-all font-mono text-sm">{device.MACAddress || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">获取方式</p>
              <p className="text-sm">{device.AddressSource || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">信号强度</p>
              <p className="text-sm">{device.rssi ? `${device.rssi} dBm` : '-'}</p>
            </div>
          </div>

          <Separator />

          {/* 流量信息 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">上行流量</p>
              <p className="text-sm font-medium text-info">{formatBytesFromString(device.TxKBytes, true)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">下行流量</p>
              <p className="text-sm font-medium text-brand">{formatBytesFromString(device.RxKBytes, true)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">当前上行速率</p>
              <p className="text-sm">{device.UpRate ? `${device.UpRate} KB/s` : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">当前下行速率</p>
              <p className="text-sm">{device.DownRate ? `${device.DownRate} KB/s` : '-'}</p>
            </div>
          </div>

          <Separator />

          {/* 时间信息 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">在线时长</p>
              <p className="text-sm">{formatDurationFromString(device.AssociatedTime)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">设备类型</p>
              <p className="text-sm">{device.IconType || '-'}</p>
            </div>
          </div>

          {/* 设备信息 */}
          {(device.VendorClassID || device.DeviceBrands) && (
            <>
              <Separator />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {device.DeviceBrands && (
                  <div>
                    <p className="text-sm text-muted-foreground">品牌</p>
                    <p className="text-sm">{device.DeviceBrands}</p>
                  </div>
                )}
                {device.VendorClassID && (
                  <div>
                    <p className="text-sm text-muted-foreground">设备类型</p>
                    <p className="text-sm">{device.VendorClassID}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {device.MACAddress ? (
            <>
              <Separator />
              <DeviceHistoryPanel key={device.MACAddress} mac={device.MACAddress} />
            </>
          ) : null}

          <details className="rounded-2xl border border-border/70 bg-muted/20">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              查看 CPE 原始终端数据
            </summary>
            <pre className="max-h-64 overflow-auto border-t border-border/70 p-4 text-xs leading-5 text-muted-foreground">
              {JSON.stringify(device, null, 2)}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
