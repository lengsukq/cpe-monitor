'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface DeviceDetail {
  HostName: string;
  IPAddress: string;
  MACAddress: string;
  Active: boolean;
  UploadBytes: string;
  DownloadBytes: string;
  OnlineDuration: string;
  IconType: string;
  Frequency: string;
  InterfaceType: string;
  AddressSource: string;
  AssociatedTime: string;
  SignalStrength?: string;
  VendorClassID?: string;
  DeviceBrands?: string;
  [key: string]: any;
}

interface DeviceDetailDialogProps {
  device: DeviceDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBytes(bytesStr: string | undefined, inKB = false) {
  let bytes = parseInt(bytesStr || '0');
  if (inKB) bytes = bytes * 1024;
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(seconds: string | undefined) {
  const s = parseInt(seconds || '0');
  if (s < 60) return `${s}秒`;
  if (s < 3600) return `${Math.floor(s / 60)}分钟`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}小时${m}分钟`;
}

function getDeviceIcon(iconType: string) {
  switch (iconType?.toLowerCase()) {
    case 'computer': return '💻';
    case 'mobile': return '📱';
    case 'tablet': return '📱';
    case 'router': return '📡';
    case 'tv': return '📺';
    case 'printer': return '🖨️';
    case 'camera': return '📷';
    case 'game': return '🎮';
    default: return '🖥️';
  }
}

export default function DeviceDetailDialog({ device, open, onOpenChange }: DeviceDetailDialogProps) {
  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getDeviceIcon(device.IconType)}</span>
            {device.HostName || '未知设备'}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-muted-foreground">IP 地址</p>
              <p className="font-mono text-sm">{device.IPAddress || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">MAC 地址</p>
              <p className="font-mono text-sm">{device.MACAddress || '-'}</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-muted-foreground">上行流量</p>
              <p className="text-sm font-medium text-purple-600">{formatBytes(device.TxKBytes, true)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">下行流量</p>
              <p className="text-sm font-medium text-blue-600">{formatBytes(device.RxKBytes, true)}</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-muted-foreground">在线时长</p>
              <p className="text-sm">{formatDuration(device.AssociatedTime)}</p>
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
              <div className="grid grid-cols-2 gap-3">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
