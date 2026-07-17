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
import { formatBytesFromString, formatDurationFromString, getCarrier } from '@/lib/format';
import { Activity, Cpu, Database, Network, Phone, Radio, RefreshCw, Router, ShieldCheck, Wifi } from 'lucide-react';

export default function DevicePage() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rawDevices, setRawDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deviceError, setDeviceError] = useState('');
  const [devicesError, setDevicesError] = useState('');

  async function fetchDeviceInfo(attempt = 0) {
    let retryScheduled = false;
    try {
      const res = await fetch('/api/dashboard/device');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '获取设备信息失败');
      if (!data.deviceInformation?.DeviceName) {
        if (attempt < 2) {
          retryScheduled = true;
          setDeviceError('CPE 身份信息暂未返回，正在自动重试…');
          window.setTimeout(() => { void fetchDeviceInfo(attempt + 1); }, 1000);
          return;
        }
        throw new Error('CPE 未返回设备身份信息，请点击刷新重试');
      }
      setDeviceInfo(data);
      setDeviceError('');
    } catch (e: any) {
      console.error(e);
      setDeviceError(e.message || '无法获取设备信息');
    }
    finally {
      if (!retryScheduled) setLoading(false);
    }
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

  async function refreshDevicePage() {
    // The CPE exposes one shared web session. Fetch identity first so the
    // HostInfo request cannot make an in-flight identity response incomplete.
    await fetchDeviceInfo();
    await fetchConnectedDevices();
  }

  useEffect(() => {
    void refreshDevicePage();
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
  const deviceState = deviceInfo?.deviceInfo;
  const onlineState = deviceInfo?.onlineState;
  const cell = deviceInfo?.cellInformation;
  const cellStatus = cell?.status;
  const signal = cell?.signal;
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
        <Button size="sm" variant="outline" onClick={() => { void refreshDevicePage(); }}>
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
          <section className="relative overflow-hidden rounded-[2rem] border border-emerald-300/20 bg-[#102219] px-6 py-7 text-white shadow-xl shadow-emerald-950/15 lg:px-8">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-emerald-300/15 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-24 w-72 rounded-full bg-lime-200/10 blur-3xl" />
            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80"><Router className="h-4 w-4" />CPE identity console</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight">{info.spreadname_zh || info.spreadname_en || info.DeviceName}</h2>
                <p className="mt-2 text-sm text-emerald-50/70">{getCarrier(info.Mccmnc)} · {cell?.networkType || '网络状态读取中'} · {info.DeviceName}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[620px]">
                <IdentityTile icon={<Phone className="h-4 w-4" />} label="SIM 手机号" value={info.Msisdn || '未返回'} />
                <IdentityTile icon={<Radio className="h-4 w-4" />} label="当前小区" value={cell?.cellId || '未返回'} mono />
                <IdentityTile icon={<ShieldCheck className="h-4 w-4" />} label="ICCID" value={info.Iccid || '未返回'} mono />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CapabilityCard icon={<Cpu className="h-5 w-5" />} label="厂商/型号" value={[vendor, info.DeviceName].filter(Boolean).join(' / ') || '-'} />
            <CapabilityCard icon={<Wifi className="h-5 w-5" />} label="双频优选" value={formatFeatureState(wlanDbho)} />
            <CapabilityCard icon={<Network className="h-5 w-5" />} label="拓扑状态" value={formatFeatureState(topology)} />
            <CapabilityCard icon={<ActivityDot />} label="在线终端" value={`${countTopology(topology)} 台`} />
          </div>

          {/* Basic Info */}
          <Card className="card-hover">
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Field label="产品名称" value={info.spreadname_zh || info.spreadname_en} />
                <Field label="设备友好名称" value={deviceState?.FriendlyName || info.spreadname_zh} />
                <Field label="厂商" value={vendor} />
                <Field label="设备型号" value={info.DeviceName} />
                <Field label="分类" value={info.Classify?.toUpperCase()} />
                <Field label="运行时长" value={formatDurationFromString(info.uptime)} />
                <Field label="设备图标类型" value={deviceState?.DeviceIconType} />
                <Field label="厂商 OUI" value={deviceState?.ManufacturerOUI} mono />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">连接状态</p>
                  <Badge variant={cell?.connectionStatus === '901' ? 'default' : 'secondary'}>
                    {cell?.connectionStatus === '901' ? '已连接' : '未连接'}
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
                <Field label="当前版本" value={onlineState?.CurrentVersion} />
                <Field label="升级次数" value={onlineState?.UpgTimes} />
                <Field label="在线升级" value={formatFlag(onlineState?.IsSupportOnlineUpg)} />
                <Field label="主设备" value={formatFlag(onlineState?.IsMainDevice)} />
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
                <Field label="信号强度" value={cell?.rsrp || '-'} />
              </div>
              {cell && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="网络类型" value={cell.networkType} />
                    {cell.band && <Field label="频段" value={cell.band} />}
                    {cell.cellId && <Field label="小区 ID" value={cell.cellId} mono />}
                    {cell.pci && <Field label="PCI" value={cell.pci} />}
                    {cell.rsrp && <Field label="RSRP" value={cell.rsrp} />}
                    {cell.rsrq && <Field label="RSRQ" value={cell.rsrq} />}
                    {cell.sinr && <Field label="SINR" value={cell.sinr} />}
                    {cell.rssi && <Field label="RSSI" value={cell.rssi} />}
                    {cell.nrarfcn && <Field label="NR ARFCN" value={cell.nrarfcn} />}
                    {signal?.tac && <Field label="TAC" value={signal.tac} mono />}
                    {cell.cellInfo?.lac && <Field label="小区 LAC" value={cell.cellInfo.lac} mono />}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Cellular status */}
          <Card className="card-hover">
            <CardHeader><CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-primary" />蜂窝与 SIM 状态</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <Field label="连接状态码" value={cell?.connectionStatus} />
                <Field label="服务状态" value={formatStatusCode(cellStatus?.ServiceStatus)} />
                <Field label="SIM 状态" value={formatStatusCode(cellStatus?.SimStatus)} />
                <Field label="漫游状态" value={formatStatusCode(cellStatus?.RoamingStatus)} />
                <Field label="飞行模式" value={formatFlag(cellStatus?.flymode, true)} />
                <Field label="无线网络模式码" value={cellStatus?.CurrentNetworkTypeEx} />
                <Field label="RRC 状态" value={formatStatusCode(signal?.rrc_status)} />
                <Field label="IMS 注册" value={formatFlag(signal?.ims, true)} />
                <Field label="Wi-Fi 状态" value={formatFlag(cellStatus?.WifiStatus, true)} />
                <Field label="当前 Wi-Fi 用户" value={cellStatus?.CurrentWifiUser} />
                <Field label="最大 Wi-Fi 用户" value={cellStatus?.TotalWifiUser} />
                <Field label="信号图标等级" value={cellStatus?.SignalIconNr} />
              </div>
            </CardContent>
          </Card>

          {/* Radio details */}
          <Card className="card-hover">
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />5G 射频详细参数</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <Field label="NR RSRP" value={signal?.nrrsrp} />
                <Field label="NR RSRQ" value={signal?.nrrsrq} />
                <Field label="NR RSSI" value={signal?.nrrssi} />
                <Field label="NR SINR" value={signal?.nrsinr} />
                <Field label="PCI" value={signal?.pci} />
                <Field label="频段" value={signal?.band} />
                <Field label="上行带宽" value={signal?.nrulbandwidth} />
                <Field label="下行带宽" value={signal?.nrdlbandwidth} />
                <Field label="NR Rank" value={signal?.nrrank} />
                <Field label="NR BLER" value={signal?.nrbler} />
                <Field label="下行频率" value={signal?.nrdlfreq} />
                <Field label="上行频率" value={signal?.nrulfreq} />
                <Field label="下行 CQI" value={signal?.nrcqi0} />
                <Field label="下行 MCS" value={signal?.nrdlmcs} />
                <Field label="上行 MCS" value={signal?.nrulmcs} />
              </div>
              <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 md:grid-cols-2">
                <Field label="NR 发射功率" value={signal?.nrtxpower} />
                <Field label="LTE/NR 协同状态" value={formatStatusCode(cellStatus?.EndcStatus)} />
              </div>
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
                <Field label="WAN IPv4 地址" value={info.WanIPAddress} mono />
                <Field label="备用 WAN IPv4" value={info.SecondWanIPAddress} mono />
                <Field label="IPv6 地址" value={info.SecondWanIPv6Address || info.WanIPv6Address} mono />
                <Field label="WAN IPv6 地址" value={info.WanIPv6Address} mono />
                <Field label="DNS (IPv4)" value={info.wan_dns_address} mono />
                <Field label="DNS (IPv6)" value={info.wan_ipv6_dns_address} mono />
                <Field label="子网掩码" value={info.submask} mono />
                <Field label="设备管理地址" value={onlineState?.URL} mono />
                <Field label="设备 IP" value={onlineState?.IpAddress} mono />
              </div>
            </CardContent>
          </Card>

          {/* Capabilities and service endpoints */}
          <Card className="card-hover">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />能力与服务</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <Field label="Wi-Fi 能力" value={formatWifiCapability(deviceState?.devcap?.WIFI)} />
                <Field label="USB" value={formatFlag(deviceState?.devcap?.USB, true)} />
                <Field label="访客网络" value={formatFlag(deviceState?.devcap?.GuestNetwork, true)} />
                <Field label="省电模式" value={formatFlag(deviceState?.devcap?.PowerSave, true)} />
                <Field label="重启等待时间" value={deviceState?.devcap?.RebootTime ? `${deviceState.devcap.RebootTime} 秒` : undefined} />
                <Field label="硬件账户" value={deviceState?.SmartDevInfo?.hwAccount} />
                <Field label="产品 ID" value={deviceState?.SmartDevInfo?.prodId} mono />
                <Field label="Portal 设置" value={formatFeatureState(portalSettings)} />
                <Field label="IoT 设备识别" value={formatFeatureState(iocDeviceCapacity)} />
                <Field label="WLAN 双频优选" value={formatFeatureState(wlanDbho)} />
                <Field label="设备能力接口" value={formatFeatureState(devCapacity)} />
                <Field label="周报地址" value={deviceState?.WeeklyReportUrl} />
              </div>
            </CardContent>
          </Card>

          {/* Keep every endpoint field inspectable, even when a future firmware adds fields. */}
          <Card className="card-hover">
            <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />原始接口数据</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">以下内容来自设备接口原始响应，用于核对固件新增字段。</p>
              {[
                ['设备信息接口', deviceState],
                ['在线状态接口', onlineState],
                ['蜂窝状态接口', cell],
                ['拓扑接口', topology],
                ['设备能力接口', devCapacity],
                ['Portal 接口', portalSettings],
                ['IoT 能力接口', iocDeviceCapacity],
              ].map(([label, value]) => (
                <details key={String(label)} className="group rounded-2xl border border-border/60 bg-muted/20">
                  <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">{String(label)}<span className="float-right text-muted-foreground transition-transform group-open:rotate-180">⌄</span></summary>
                  <pre className="max-h-96 overflow-auto border-t border-border/60 px-4 py-3 text-xs leading-5 text-muted-foreground">{JSON.stringify(value ?? {}, null, 2)}</pre>
                </details>
              ))}
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

function countTopology(topology: any) {
  if (!Array.isArray(topology)) return 0;
  return topology.filter((item) => item?.Active === true || item?.Active === 1 || item?.Active === '1').length;
}

function formatFlag(value: any, includeCode = false) {
  if (value === null || value === undefined || value === '') return undefined;
  if (value === true) return '是';
  if (value === false) return '否';
  const code = String(value);
  if (code === '1') return includeCode ? '是 (1)' : '是';
  if (code === '0') return includeCode ? '否 (0)' : '否';
  return code;
}

function formatStatusCode(value: any) {
  if (value === null || value === undefined || value === '') return undefined;
  const code = String(value);
  const labels: Record<string, string> = {
    '0': '否',
    '1': '正常',
    '2': '已启用',
    '901': '已连接',
  };
  return labels[code] ? `${labels[code]} (${code})` : code;
}

function formatWifiCapability(value: any) {
  if (value === 2 || value === '2') return '双频 Wi-Fi (2)';
  if (value === 1 || value === '1') return '单频 Wi-Fi (1)';
  return value === null || value === undefined || value === '' ? undefined : String(value);
}

function formatFeatureState(value: any) {
  if (!value) return '未返回';
  if (typeof value === 'string') return value || '已返回';
  const status = value.Enable ?? value.enabled ?? value.Switch ?? value.DbhoEnable ?? value.portalEnable;
  if (status === '1' || status === 1 || status === true) return '已启用';
  if (status === '0' || status === 0 || status === false) return '未启用';
  return '已返回';
}

function ActivityDot() {
  return <span className="h-2.5 w-2.5 rounded-full bg-primary" />;
}

function IdentityTile({ icon, label, value, mono }: { icon: ReactNode; label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 backdrop-blur-sm">
      <p className="flex items-center gap-2 text-xs text-emerald-100/65">{icon}{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold text-white ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
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

function Field({ label, value, mono }: { label: string; value: string | number | undefined; mono?: boolean }) {
  const displayValue = value === null || value === undefined || value === '' ? '-' : decodeDisplayValue(String(value));
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`break-words font-medium ${mono ? 'font-mono text-sm' : ''}`}>{displayValue}</p>
    </div>
  );
}

function decodeDisplayValue(value: string) {
  return value
    .replace(/&#40;/g, '(')
    .replace(/&#41;/g, ')')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
