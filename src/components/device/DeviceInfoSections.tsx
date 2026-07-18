import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import InfoField from '@/components/InfoField';
import {
  formatFeatureState,
  formatFlag,
  formatStatusCode,
  formatWifiCapability,
} from '@/lib/device-display';
import { formatDurationFromString, getCarrier } from '@/lib/format';
import { Activity, Database, Radio, ShieldCheck } from 'lucide-react';

interface DeviceInfoSectionsProps {
  info: Record<string, any>;
  deviceState?: Record<string, any>;
  onlineState?: Record<string, any>;
  cell?: Record<string, any> | null;
  vendor?: string;
  wlanDbho?: unknown;
  topology?: unknown;
  devCapacity?: unknown;
  portalSettings?: unknown;
  iocDeviceCapacity?: unknown;
}

export default function DeviceInfoSections({
  info,
  deviceState,
  onlineState,
  cell,
  vendor,
  wlanDbho,
  topology,
  devCapacity,
  portalSettings,
  iocDeviceCapacity,
}: DeviceInfoSectionsProps) {
  const cellStatus = cell?.status;
  const signal = cell?.signal;

  return (
    <>
          {/* Basic Info */}
          <Card className="card-hover">
            <CardHeader><CardTitle>基本信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <InfoField label="产品名称" value={info.spreadname_zh || info.spreadname_en} />
                <InfoField label="设备友好名称" value={deviceState?.FriendlyName || info.spreadname_zh} />
                <InfoField label="厂商" value={vendor} />
                <InfoField label="设备型号" value={info.DeviceName} />
                <InfoField label="分类" value={info.Classify?.toUpperCase()} />
                <InfoField label="运行时长" value={formatDurationFromString(info.uptime)} />
                <InfoField label="设备图标类型" value={deviceState?.DeviceIconType} />
                <InfoField label="厂商 OUI" value={deviceState?.ManufacturerOUI} mono />
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
                <InfoField label="固件版本" value={info.SoftwareVersion} />
                <InfoField label="WebUI 版本" value={info.WebUIVersion} />
                <InfoField label="硬件版本" value={info.HardwareVersion} />
                <InfoField label="参数版本" value={info.ParameterVersion} />
                <InfoField label="初始版本" value={info.iniversion} />
                <InfoField label="当前版本" value={onlineState?.CurrentVersion} />
                <InfoField label="升级次数" value={onlineState?.UpgTimes} />
                <InfoField label="在线升级" value={formatFlag(onlineState?.IsSupportOnlineUpg)} />
                <InfoField label="主设备" value={formatFlag(onlineState?.IsMainDevice)} />
              </div>
            </CardContent>
          </Card>

          {/* Network */}
          <Card className="card-hover">
            <CardHeader><CardTitle>网络信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <InfoField label="工作模式" value={info.workmode} />
                <InfoField label="支持模式" value={info.supportmode} />
                <InfoField label="运营商" value={getCarrier(info.Mccmnc)} />
                <InfoField label="MCC-MNC" value={info.Mccmnc} mono />
                <InfoField label="信号强度" value={cell?.rsrp || '-'} />
              </div>
              {cell && (
                <>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <InfoField label="网络类型" value={cell.networkType} />
                    {cell.band && <InfoField label="频段" value={cell.band} />}
                    {cell.cellId && <InfoField label="小区 ID" value={cell.cellId} mono />}
                    {cell.pci && <InfoField label="PCI" value={cell.pci} />}
                    {cell.rsrp && <InfoField label="RSRP" value={cell.rsrp} />}
                    {cell.rsrq && <InfoField label="RSRQ" value={cell.rsrq} />}
                    {cell.sinr && <InfoField label="SINR" value={cell.sinr} />}
                    {cell.rssi && <InfoField label="RSSI" value={cell.rssi} />}
                    {cell.nrarfcn && <InfoField label="NR ARFCN" value={cell.nrarfcn} />}
                    {signal?.tac && <InfoField label="TAC" value={signal.tac} mono />}
                    {cell.cellInfo?.lac && <InfoField label="小区 LAC" value={cell.cellInfo.lac} mono />}
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
                <InfoField label="连接状态码" value={cell?.connectionStatus} />
                <InfoField label="服务状态" value={formatStatusCode(cellStatus?.ServiceStatus)} />
                <InfoField label="SIM 状态" value={formatStatusCode(cellStatus?.SimStatus)} />
                <InfoField label="漫游状态" value={formatStatusCode(cellStatus?.RoamingStatus)} />
                <InfoField label="飞行模式" value={formatFlag(cellStatus?.flymode, true)} />
                <InfoField label="无线网络模式码" value={cellStatus?.CurrentNetworkTypeEx} />
                <InfoField label="RRC 状态" value={formatStatusCode(signal?.rrc_status)} />
                <InfoField label="IMS 注册" value={formatFlag(signal?.ims, true)} />
                <InfoField label="Wi-Fi 状态" value={formatFlag(cellStatus?.WifiStatus, true)} />
                <InfoField label="当前 Wi-Fi 用户" value={cellStatus?.CurrentWifiUser} />
                <InfoField label="最大 Wi-Fi 用户" value={cellStatus?.TotalWifiUser} />
                <InfoField label="信号图标等级" value={cellStatus?.SignalIconNr} />
              </div>
            </CardContent>
          </Card>

          {/* Radio details */}
          <Card className="card-hover">
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />5G 射频详细参数</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <InfoField label="NR RSRP" value={signal?.nrrsrp} />
                <InfoField label="NR RSRQ" value={signal?.nrrsrq} />
                <InfoField label="NR RSSI" value={signal?.nrrssi} />
                <InfoField label="NR SINR" value={signal?.nrsinr} />
                <InfoField label="PCI" value={signal?.pci} />
                <InfoField label="频段" value={signal?.band} />
                <InfoField label="上行带宽" value={signal?.nrulbandwidth} />
                <InfoField label="下行带宽" value={signal?.nrdlbandwidth} />
                <InfoField label="NR Rank" value={signal?.nrrank} />
                <InfoField label="NR BLER" value={signal?.nrbler} />
                <InfoField label="下行频率" value={signal?.nrdlfreq} />
                <InfoField label="上行频率" value={signal?.nrulfreq} />
                <InfoField label="下行 CQI" value={signal?.nrcqi0} />
                <InfoField label="下行 MCS" value={signal?.nrdlmcs} />
                <InfoField label="上行 MCS" value={signal?.nrulmcs} />
              </div>
              <div className="grid gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 md:grid-cols-2">
                <InfoField label="NR 发射功率" value={signal?.nrtxpower} />
                <InfoField label="LTE/NR 协同状态" value={formatStatusCode(cellStatus?.EndcStatus)} />
              </div>
            </CardContent>
          </Card>

          {/* Identifiers */}
          <Card className="card-hover">
            <CardHeader><CardTitle>标识信息</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <InfoField label="IMEI" value={info.Imei} mono />
                <InfoField label="IMSI" value={info.Imsi} mono />
                <InfoField label="ICCID" value={info.Iccid} mono />
                <InfoField label="MSISDN" value={info.Msisdn} mono />
                <InfoField label="序列号" value={info.SerialNumber} mono />
                <InfoField label="IMEI SVN" value={info.ImeiSvn} />
              </div>
            </CardContent>
          </Card>

          {/* MAC Addresses */}
          <Card className="card-hover">
            <CardHeader><CardTitle>MAC 地址</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <InfoField label="LAN MAC" value={info.MacAddress1} mono />
                <InfoField label="MAC2" value={info.MacAddress2} mono />
                <InfoField label="WiFi 2.4G MAC" value={info.WifiMacAddrWl0} mono />
                <InfoField label="WiFi 5G MAC" value={info.WifiMacAddrWl1} mono />
              </div>
            </CardContent>
          </Card>

          {/* Network Addresses */}
          <Card className="card-hover">
            <CardHeader><CardTitle>网络地址</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoField label="IPv4 地址" value={info.SecondWanIPAddress || info.WanIPAddress} mono />
                <InfoField label="WAN IPv4 地址" value={info.WanIPAddress} mono />
                <InfoField label="备用 WAN IPv4" value={info.SecondWanIPAddress} mono />
                <InfoField label="IPv6 地址" value={info.SecondWanIPv6Address || info.WanIPv6Address} mono />
                <InfoField label="WAN IPv6 地址" value={info.WanIPv6Address} mono />
                <InfoField label="DNS (IPv4)" value={info.wan_dns_address} mono />
                <InfoField label="DNS (IPv6)" value={info.wan_ipv6_dns_address} mono />
                <InfoField label="子网掩码" value={info.submask} mono />
                <InfoField label="设备管理地址" value={onlineState?.URL} mono />
                <InfoField label="设备 IP" value={onlineState?.IpAddress} mono />
              </div>
            </CardContent>
          </Card>

          {/* Capabilities and service endpoints */}
          <Card className="card-hover">
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />能力与服务</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <InfoField label="Wi-Fi 能力" value={formatWifiCapability(deviceState?.devcap?.WIFI)} />
                <InfoField label="USB" value={formatFlag(deviceState?.devcap?.USB, true)} />
                <InfoField label="访客网络" value={formatFlag(deviceState?.devcap?.GuestNetwork, true)} />
                <InfoField label="省电模式" value={formatFlag(deviceState?.devcap?.PowerSave, true)} />
                <InfoField label="重启等待时间" value={deviceState?.devcap?.RebootTime ? `${deviceState.devcap.RebootTime} 秒` : undefined} />
                <InfoField label="硬件账户" value={deviceState?.SmartDevInfo?.hwAccount} />
                <InfoField label="产品 ID" value={deviceState?.SmartDevInfo?.prodId} mono />
                <InfoField label="Portal 设置" value={formatFeatureState(portalSettings)} />
                <InfoField label="IoT 设备识别" value={formatFeatureState(iocDeviceCapacity)} />
                <InfoField label="WLAN 双频优选" value={formatFeatureState(wlanDbho)} />
                <InfoField label="设备能力接口" value={formatFeatureState(devCapacity)} />
                <InfoField label="周报地址" value={deviceState?.WeeklyReportUrl} />
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
  );
}
