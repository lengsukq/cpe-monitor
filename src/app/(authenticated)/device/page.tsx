'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import DeviceDetailDialog from '@/components/DeviceDetailDialog';
import { formatBytesFromString, formatDurationFromString, getCarrier, getNetworkType } from '@/lib/format';
import { Cpu, Network, RefreshCw, Wifi } from 'lucide-react';

export default function DevicePage() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rawDevices, setRawDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [devicesError, setDevicesError] = useState('');

  async function fetchDeviceInfo() {
    try {
      const res = await fetch('/api/dashboard/device');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取设备信息失败');
      setDeviceInfo(data);
      setDeviceError('');
    } catch (e: any) {
      console.error(e);
      setDeviceError(e.message || '无法获取设备信息');
    }
    finally { setLoading(false); }
  }

  async function fetchConnectedDevices() {
    try {
      const res = await fetch('/api/dashboard/devices');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取在线设备失败');
      setRawDevices(data.devices || []);
      setDevicesError('');
    } catch (e: any) {
      console.error(e);
      setDevicesError(e.message || 'CPE 登录失败，无法获取在线设备列表。');
    }
    finally { setDevicesLoading(false); }
  }

  useEffect(() => {
    fetchDeviceInfo();
    fetchConnectedDevices();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const info = deviceInfo?.deviceInformation;
  const os = deviceInfo?.onlineState;
  const cell = os?.CellData;
  const vendor = getDisplayValue(deviceInfo?.vendorName, ['vendorname', 'VendorName', 'vendor', 'name']);
  const wlanDbho = deviceInfo?.wlanDbho;
  const topology = deviceInfo?.topology;
  const devCapacity = deviceInfo?.devCapacity;
  const portalSettings = deviceInfo?.portalSettings;
  const iocDeviceCapacity = deviceInfo?.iocDeviceCapacity;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">设备信息</h1>
          <p className="text-sm text-muted-foreground">聚合设备身份、蜂窝状态、拓扑、能力和在线终端接口</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { fetchDeviceInfo(); fetchConnectedDevices(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />刷新
        </Button>
      </div>

      {deviceError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          {deviceError}
        </div>
      )}

      {info ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CapabilityCard icon={<Cpu className="h-5 w-5" />} label="厂商/型号" value={[vendor, info.DeviceName].filter(Boolean).join(' / ') || '-'} />
            <CapabilityCard icon={<Wifi className="h-5 w-5" />} label="双频优选" value={formatFeatureState(wlanDbho)} />
            <CapabilityCard icon={<Network className="h-5 w-5" />} label="拓扑状态" value={formatFeatureState(topology)} />
            <CapabilityCard icon={<ActivityDot />} label="能力清单" value={formatCapacitySummary(devCapacity, iocDeviceCapacity, portalSettings)} />
          </div>

          {/* Basic Info */}
          <Card className="card-hover">
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Field label="产品名称" value={info.spreadname_zh || info.spreadname_en} />
                <Field label="厂商" value={vendor} />
                <Field label="设备型号" value={info.DeviceName} />
                <Field label="分类" value={info.Classify?.toUpperCase()} />
                <Field label="运行时长" value={formatDurationFromString(info.uptime)} />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">连接状态</p>
                  <Badge variant={os?.ConnectionStatus === '901' ? 'default' : 'secondary'}>
                    {os?.ConnectionStatus === '901' ? '已连接' : '未连接'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Software */}
          <Card className="card-hover">
            <CardHeader><CardTitle>软件版本</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="固件版本" value={info.SoftwareVersion} />
                <Field label="WebUI 版本" value={info.WebUIVersion} />
                <Field label="硬件版本" value={info.HardwareVersion} />
                <Field label="参数版本" value={info.ParameterVersion} />
                <Field label="初始版本" value={info.iniversion} />
              </div>
            </CardContent>
          </Card>

          {/* Network */}
          <Card className="card-hover">
            <CardHeader><CardTitle>网络信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Field label="工作模式" value={info.workmode} />
                <Field label="支持模式" value={info.supportmode} />
                <Field label="运营商" value={getCarrier(info.Mccmnc)} />
                <Field label="MCC-MNC" value={info.Mccmnc} mono />
                <Field label="信号强度" value={`${cell?.SignalStrength || 0} dBm`} />
              </div>
              {cell && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="网络类型" value={getNetworkType(os)} />
                    {cell.Band && <Field label="频段" value={cell.Band} />}
                    {cell.CellID && <Field label="小区 ID" value={cell.CellID} mono />}
                    {cell.PCI && <Field label="PCI" value={cell.PCI} />}
                    {cell.RSRP && <Field label="RSRP" value={`${cell.RSRP} dBm`} />}
                    {cell.RSRQ && <Field label="RSRQ" value={`${cell.RSRQ} dB`} />}
                    {cell.SINR && <Field label="SINR" value={`${cell.SINR} dB`} />}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Identifiers */}
          <Card className="card-hover">
            <CardHeader><CardTitle>标识信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Field label="IMEI" value={info.Imei} mono />
                <Field label="IMSI" value={info.Imsi} mono />
                <Field label="ICCID" value={info.Iccid} mono />
                <Field label="MSISDN" value={info.Msisdn} mono />
                <Field label="序列号" value={info.SerialNumber} mono />
                <Field label="IMEI SVN" value={info.ImeiSvn} />
              </div>
            </CardContent>
          </Card>

          {/* MAC Addresses */}
          <Card className="card-hover">
            <CardHeader><CardTitle>MAC 地址</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Field label="LAN MAC" value={info.MacAddress1} mono />
                <Field label="MAC2" value={info.MacAddress2} mono />
                <Field label="WiFi 2.4G MAC" value={info.WifiMacAddrWl0} mono />
                <Field label="WiFi 5G MAC" value={info.WifiMacAddrWl1} mono />
              </div>
            </CardContent>
          </Card>

          {/* Network Addresses */}
          <Card className="card-hover">
            <CardHeader><CardTitle>网络地址</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="IPv4 地址" value={info.SecondWanIPAddress || info.WanIPAddress} mono />
                <Field label="IPv6 地址" value={info.SecondWanIPv6Address || info.WanIPv6Address} mono />
                <Field label="DNS (IPv4)" value={info.wan_dns_address} mono />
                <Field label="DNS (IPv6)" value={info.wan_ipv6_dns_address} mono />
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="pt-6"><p className="text-muted-foreground">无法获取设备信息，请检查 CPE 配置或稍后刷新。</p></CardContent></Card>
      )}

      {/* Connected Devices */}
      <Card className="card-hover">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>在线设备</CardTitle>
            <Button size="sm" variant="outline" onClick={fetchConnectedDevices}>刷新</Button>
          </div>
        </CardHeader>
        <CardContent>
          {devicesError && (
            <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">CPE 登录/连接失败</p>
              <p className="mt-1">{devicesError}</p>
            </div>
          )}
          {devicesLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : rawDevices.length > 0 ? (
            <Table>
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
                {rawDevices.map((d: any, i: number) => (
                  <TableRow
                    key={d.MACAddress || i}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setSelectedDevice(d); setDialogOpen(true); }}
                  >
                    <TableCell className="font-medium">{d.HostName || '未知设备'}</TableCell>
                    <TableCell className="font-mono text-sm">{d.IPAddress}</TableCell>
                    <TableCell className="font-mono text-sm">{d.MACAddress}</TableCell>
                    <TableCell>{d.Frequency || '-'}</TableCell>
                    <TableCell className="text-right">{formatBytesFromString(d.RxKBytes, true)}</TableCell>
                    <TableCell className="text-right">{formatBytesFromString(d.TxKBytes, true)}</TableCell>
                    <TableCell className="text-right">{formatDurationFromString(d.AssociatedTime)}</TableCell>
                    <TableCell>
                      <Badge variant={d.Active ? 'default' : 'secondary'}>
                        {d.Active ? '在线' : '离线'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">暂无在线设备</p>
          )}
        </CardContent>
      </Card>

      <DeviceDetailDialog device={selectedDevice} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function getDisplayValue(source: any, keys: string[]) {
  if (!source) return undefined;
  if (typeof source === 'string') return source;
  for (const key of keys) {
    if (source[key]) return String(source[key]);
  }
  return undefined;
}

function formatFeatureState(value: any) {
  if (!value) return '未返回';
  if (typeof value === 'string') return value || '已返回';
  const status = value.Enable ?? value.enabled ?? value.Switch ?? value.DbhoEnable ?? value.portalEnable;
  if (status === '1' || status === 1 || status === true) return '已启用';
  if (status === '0' || status === 0 || status === false) return '未启用';
  return '已返回';
}

function formatCapacitySummary(devCapacity: any, iocDeviceCapacity: any, portalSettings: any) {
  const parts = [];
  if (devCapacity) parts.push('设备能力');
  if (iocDeviceCapacity) parts.push('IoT 识别');
  if (portalSettings) parts.push('Portal');
  return parts.length ? parts.join(' / ') : '未返回';
}

function ActivityDot() {
  return <span className="h-2.5 w-2.5 rounded-full bg-primary" />;
}

function CapabilityCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="card-hover">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate font-medium">{value || '-'}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string | undefined; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`font-medium ${mono ? 'font-mono text-sm' : ''}`}>{value || '-'}</p>
    </div>
  );
}
