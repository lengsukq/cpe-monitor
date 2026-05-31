'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import TrafficChart from '@/components/TrafficChart';
import DeviceDetailDialog from '@/components/DeviceDetailDialog';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [trafficHistory, setTrafficHistory] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [deviceInfoLoading, setDeviceInfoLoading] = useState(true);
  const [rawDevices, setRawDevices] = useState<any[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [trafficStats, setTrafficStats] = useState<any>(null);
  const [trafficStatsLoading, setTrafficStatsLoading] = useState(true);
  const [unit, setUnit] = useState<'MB' | 'GB'>('GB');
  const [startDate, setStartDate] = useState<any>(null);
  const [startDateLoading, setStartDateLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
    fetchTrafficHistory();
    fetchDeviceInfo();
    fetchConnectedDevices();
    fetchTrafficStats();
    fetchStartDate();

    // Auto-refresh real-time data every 5 seconds
    const interval = setInterval(() => {
      fetchOverview();
      fetchTrafficStats();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTrafficHistory();
  }, [timeRange]);

  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/dashboard/overview');
      setOverview(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchTrafficHistory = async () => {
    try {
      const res = await fetch(`/api/dashboard/traffic?range=${timeRange}`);
      setTrafficHistory(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchDeviceInfo = async () => {
    try {
      const res = await fetch('/api/dashboard/device');
      if (res.ok) setDeviceInfo(await res.json());
    } catch (e) { console.error(e); }
    finally { setDeviceInfoLoading(false); }
  };

  const fetchConnectedDevices = async () => {
    try {
      const res = await fetch('/api/dashboard/devices');
      if (res.ok) {
        const data = await res.json();
        setRawDevices(data.devices || []);
      }
    } catch (e) { console.error(e); }
    finally { setDevicesLoading(false); }
  };

  const fetchTrafficStats = async () => {
    try {
      const res = await fetch('/api/dashboard/traffic-stats');
      if (res.ok) setTrafficStats(await res.json());
    } catch (e) { console.error(e); }
    finally { setTrafficStatsLoading(false); }
  };

  const fetchStartDate = async () => {
    try {
      const res = await fetch('/api/dashboard/start-date');
      if (res.ok) setStartDate(await res.json());
    } catch (e) { console.error(e); }
    finally { setStartDateLoading(false); }
  };

  const toggleScheduler = async () => {
    if (!overview) return;
    setSchedulerLoading(true);
    try {
      const res = await fetch('/api/dashboard/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: !overview.schedulerStatus.enabled,
          interval: overview.schedulerStatus.interval,
        }),
      });
      if (res.ok) await fetchOverview();
    } catch (e) { console.error(e); }
    finally { setSchedulerLoading(false); }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatWithUnit = (bytes: number, u: 'MB' | 'GB') => {
    if (bytes === 0) return '0 ' + u;
    const divisor = u === 'GB' ? 1073741824 : 1048576;
    return (bytes / divisor).toFixed(2) + ' ' + u;
  };

  const formatRate = (kbps: number) => {
    if (kbps >= 1024) return (kbps / 1024).toFixed(1) + ' MB/s';
    return kbps + ' KB/s';
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}小时${m}分钟`;
  };

  const getSignalQuality = (strength: number) => {
    if (strength === 0) return null;
    if (strength >= -70) return { label: '优秀', variant: 'default' as const };
    if (strength >= -85) return { label: '良好', variant: 'secondary' as const };
    if (strength >= -100) return { label: '一般', variant: 'outline' as const };
    return { label: '差', variant: 'destructive' as const };
  };

  const getNetworkType = (os: any) => {
    if (!os?.CellData) return '未知';
    const m = os.CellData.WirelessNetworkMode;
    if (m === 'LTE') return '4G LTE';
    if (m === 'NR') return '5G NR';
    if (m === 'NSA') return '5G NSA';
    return m || '未知';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const sq = overview ? getSignalQuality(overview.signalStrength) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">下载速率</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{trafficStats ? formatRate(parseInt(trafficStats.CurrentDownloadRate || '0')) : formatBytes(overview?.currentDownload || 0)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">上传速率</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-600">{trafficStats ? formatRate(parseInt(trafficStats.CurrentUploadRate || '0')) : formatBytes(overview?.currentUpload || 0)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">在线设备</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{overview?.connectedDevices || 0} 台</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">信号强度</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{overview?.signalStrength || 0} dBm{sq && <Badge variant={sq.variant} className="ml-2 text-xs">{sq.label}</Badge>}</div></CardContent></Card>
      </div>

      {/* Traffic Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>流量统计</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={unit === 'MB' ? 'default' : 'outline'} onClick={() => setUnit('MB')}>MB</Button>
              <Button size="sm" variant={unit === 'GB' ? 'default' : 'outline'} onClick={() => setUnit('GB')}>GB</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trafficStatsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : trafficStats ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">本次下载</p>
                <p className="font-medium text-blue-600">{formatWithUnit(parseInt(trafficStats.CurrentDownload || '0'), unit)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">本次上传</p>
                <p className="font-medium text-purple-600">{formatWithUnit(parseInt(trafficStats.CurrentUpload || '0'), unit)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">累计下载</p>
                <p className="font-medium text-blue-600">{formatWithUnit(parseInt(trafficStats.TotalDownload || '0'), unit)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">累计上传</p>
                <p className="font-medium text-purple-600">{formatWithUnit(parseInt(trafficStats.TotalUpload || '0'), unit)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">本次连接时长</p>
                <p className="font-medium">{formatDuration(parseInt(trafficStats.CurrentConnectTime || '0'))}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">累计连接时长</p>
                <p className="font-medium">{formatDuration(parseInt(trafficStats.TotalConnectTime || '0'))}</p>
              </div>
            </div>
          ) : <p className="text-muted-foreground">无法获取流量统计</p>}
        </CardContent>
      </Card>

      {/* Data Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>套餐用量</CardTitle>
            {startDate && <Badge variant="outline">每月 {startDate.StartDay || 1} 号重置</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {startDateLoading ? <Skeleton className="h-24" /> : startDate && trafficStats ? (() => {
            const limitBytes = parseInt(startDate.trafficmaxlimit || '0');
            const usedBytes = parseInt(trafficStats.TotalDownload || '0') + parseInt(trafficStats.TotalUpload || '0');
            const percent = limitBytes > 0 ? Math.min((usedBytes / limitBytes) * 100, 100) : 0;
            const remaining = Math.max(limitBytes - usedBytes, 0);
            const threshold = parseInt(startDate.MonthThreshold || '90');
            const isWarning = percent >= threshold;
            const isOver = percent >= 100;

            return (
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">已用 / 总量</p>
                    <p className="text-2xl font-bold">
                      <span className={isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-blue-600'}>{formatWithUnit(usedBytes, 'GB')}</span>
                      <span className="text-muted-foreground text-base font-normal"> / {formatWithUnit(limitBytes, 'GB')}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${isOver ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'}`}>{percent.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">剩余 {formatWithUnit(remaining, 'GB')}</p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${isOver ? 'bg-red-600' : isWarning ? 'bg-yellow-500' : 'bg-blue-600'}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-muted-foreground">日用量阈值</p><p className="font-medium">{startDate.DayThreshold || 90}%</p></div>
                  <div><p className="text-muted-foreground">月用量阈值</p><p className="font-medium">{startDate.MonthThreshold || 90}%</p></div>
                  <div><p className="text-muted-foreground">套餐流量</p><p className="font-medium">{startDate.DataLimit || '-'}</p></div>
                </div>
              </div>
            );
          })() : <p className="text-muted-foreground">无法获取套餐配置</p>}
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card>
        <CardHeader><CardTitle>设备信息</CardTitle></CardHeader>
        <CardContent>
          {deviceInfoLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : deviceInfo?.deviceInformation ? (() => {
            const info = deviceInfo.deviceInformation;
            const os = deviceInfo.onlineState;
            const cell = os?.CellData;
            const getCarrier = (mcc: string) => ({ '46000': '中国移动', '46001': '中国联通', '46003': '中国电信', '46005': '中国电信', '46006': '中国联通', '46007': '中国移动', '46008': '中国移动', '46009': '中国联通', '46011': '中国电信' })[mcc] || mcc;
            return (
              <div className="space-y-4">
                {/* 基本信息 */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">产品名称</p><p className="font-medium">{info.spreadname_zh || info.spreadname_en || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">设备型号</p><p className="font-medium">{info.DeviceName || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">分类</p><p className="font-medium">{info.Classify?.toUpperCase() || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">运行时长</p><p className="font-medium">{formatDuration(parseInt(info.uptime || '0'))}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">连接状态</p><Badge variant={os?.ConnectionStatus === '901' ? 'default' : 'secondary'}>{os?.ConnectionStatus === '901' ? '已连接' : '未连接'}</Badge></div>
                </div>

                <Separator />

                {/* 软件版本 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">固件版本</p><p className="font-medium">{info.SoftwareVersion || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">WebUI 版本</p><p className="font-medium">{info.WebUIVersion || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">硬件版本</p><p className="font-medium">{info.HardwareVersion || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">参数版本</p><p className="font-medium">{info.ParameterVersion || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">初始版本</p><p className="font-medium">{info.iniversion || '-'}</p></div>
                </div>

                <Separator />

                {/* 网络信息 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">工作模式</p><p className="font-medium">{info.workmode || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">支持模式</p><p className="font-medium">{info.supportmode || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">运营商</p><p className="font-medium">{getCarrier(info.Mccmnc)}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">MCC-MNC</p><p className="font-mono text-sm">{info.Mccmnc || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">信号强度</p><p className="font-medium">{cell?.SignalStrength || overview?.signalStrength || 0} dBm</p></div>
                </div>

                {/* 蜂窝网络详情 */}
                {cell && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1"><p className="text-sm text-muted-foreground">网络类型</p><p className="font-medium">{getNetworkType(os)}</p></div>
                    {cell.Band && <div className="space-y-1"><p className="text-sm text-muted-foreground">频段</p><p className="font-medium">{cell.Band}</p></div>}
                    {cell.CellID && <div className="space-y-1"><p className="text-sm text-muted-foreground">小区 ID</p><p className="font-mono text-sm">{cell.CellID}</p></div>}
                    {cell.PCI && <div className="space-y-1"><p className="text-sm text-muted-foreground">PCI</p><p className="font-medium">{cell.PCI}</p></div>}
                    {cell.RSRP && <div className="space-y-1"><p className="text-sm text-muted-foreground">RSRP</p><p className="font-medium">{cell.RSRP} dBm</p></div>}
                    {cell.RSRQ && <div className="space-y-1"><p className="text-sm text-muted-foreground">RSRQ</p><p className="font-medium">{cell.RSRQ} dB</p></div>}
                    {cell.SINR && <div className="space-y-1"><p className="text-sm text-muted-foreground">SINR</p><p className="font-medium">{cell.SINR} dB</p></div>}
                  </div>
                )}

                <Separator />

                {/* 标识信息 */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">IMEI</p><p className="font-mono text-sm">{info.Imei || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">IMSI</p><p className="font-mono text-sm">{info.Imsi || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">ICCID</p><p className="font-mono text-sm">{info.Iccid || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">MSISDN</p><p className="font-mono text-sm">{info.Msisdn || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">序列号</p><p className="font-mono text-sm">{info.SerialNumber || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">IMEI SVN</p><p className="font-medium">{info.ImeiSvn || '-'}</p></div>
                </div>

                <Separator />

                {/* MAC 地址 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">LAN MAC</p><p className="font-mono text-sm">{info.MacAddress1 || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">MAC2</p><p className="font-mono text-sm">{info.MacAddress2 || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">WiFi 2.4G MAC</p><p className="font-mono text-sm">{info.WifiMacAddrWl0 || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">WiFi 5G MAC</p><p className="font-mono text-sm">{info.WifiMacAddrWl1 || '-'}</p></div>
                </div>

                <Separator />

                {/* 网络地址 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">IPv4 地址</p><p className="font-mono text-sm">{info.SecondWanIPAddress || info.WanIPAddress || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">IPv6 地址</p><p className="font-mono text-xs break-all">{info.SecondWanIPv6Address || info.WanIPv6Address || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">DNS (IPv4)</p><p className="font-mono text-xs">{info.wan_dns_address || '-'}</p></div>
                  <div className="space-y-1"><p className="text-sm text-muted-foreground">DNS (IPv6)</p><p className="font-mono text-xs">{info.wan_ipv6_dns_address || '-'}</p></div>
                </div>
              </div>
            );
          })() : <p className="text-muted-foreground">无法获取设备信息，请检查 CPE 配置</p>}
        </CardContent>
      </Card>

      {/* Scheduler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div><h3 className="text-lg font-semibold">定时采集任务</h3><p className="text-sm text-muted-foreground">状态: {overview?.schedulerStatus.running ? '运行中' : '已停止'}</p></div>
            <div className="flex items-center gap-3"><Label htmlFor="scheduler">启用</Label><Switch id="scheduler" checked={overview?.schedulerStatus.enabled} onCheckedChange={toggleScheduler} disabled={schedulerLoading} /></div>
          </div>
        </CardContent>
      </Card>

      {/* Traffic Chart */}
      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>流量趋势</CardTitle><div className="flex gap-2">{['1h', '6h', '24h', '7d'].map((r) => <Button key={r} size="sm" variant={timeRange === r ? 'default' : 'outline'} onClick={() => setTimeRange(r)}>{r}</Button>)}</div></div></CardHeader>
        <CardContent><div className="h-80"><TrafficChart data={trafficHistory} /></div></CardContent>
      </Card>

      {/* Connected Devices Table */}
      <Card>
        <CardHeader><div className="flex items-center justify-between"><CardTitle>在线设备</CardTitle><Button size="sm" variant="outline" onClick={fetchConnectedDevices}>刷新</Button></div></CardHeader>
        <CardContent>
          {devicesLoading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          : rawDevices.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>设备名称</TableHead><TableHead>IP 地址</TableHead><TableHead>MAC 地址</TableHead><TableHead className="text-right">下行流量</TableHead><TableHead className="text-right">上行流量</TableHead><TableHead className="text-right">在线时长</TableHead><TableHead>状态</TableHead></TableRow></TableHeader>
              <TableBody>
                {rawDevices.map((d: any, i: number) => (
                  <TableRow key={d.MACAddress || i} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedDevice(d); setDialogOpen(true); }}>
                    <TableCell className="font-medium">{d.HostName || '未知设备'}</TableCell>
                    <TableCell className="font-mono text-sm">{d.IPAddress}</TableCell>
                    <TableCell className="font-mono text-sm">{d.MACAddress}</TableCell>
                    <TableCell className="text-right">{formatBytes(parseInt(d.RxKBytes || '0') * 1024)}</TableCell>
                    <TableCell className="text-right">{formatBytes(parseInt(d.TxKBytes || '0') * 1024)}</TableCell>
                    <TableCell className="text-right">{formatDuration(parseInt(d.AssociatedTime || '0'))}</TableCell>
                    <TableCell><Badge variant={d.Active ? 'default' : 'secondary'}>{d.Active ? '在线' : '离线'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-muted-foreground text-center py-8">暂无在线设备</p>}
        </CardContent>
      </Card>

      <DeviceDetailDialog device={selectedDevice} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
