'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  InterfaceType?: string;
  RxKBytes?: string;
  TxKBytes?: string;
  AssociatedTime?: string;
  Active?: boolean;
  rssi?: string | number;
  [key: string]: unknown;
}

interface OnlineDevicesTableProps {
  devices: OnlineDeviceRow[];
  loading: boolean;
  error?: string;
  onSelect: (device: OnlineDeviceRow) => void;
}

type ConnectionFilter = 'all' | '2.4g' | '5g' | 'wired';
type SortMode = 'name' | 'download' | 'upload' | 'duration' | 'signal';

function parseNumber(value: unknown): number {
  const parsed = Number.parseFloat(String(value ?? '0'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getConnectionType(device: OnlineDeviceRow): ConnectionFilter {
  const frequency = String(device.Frequency || '').toLowerCase();
  const interfaceType = String(device.InterfaceType || '').toLowerCase();
  if (interfaceType.includes('ethernet') || interfaceType.includes('wired')) return 'wired';
  if (frequency.includes('2.4') || frequency === '2g') return '2.4g';
  if (frequency.includes('5')) return '5g';
  return 'all';
}

function getSignalValue(device: OnlineDeviceRow): number | null {
  const match = String(device.rssi ?? '').match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function getConnectionLabel(device: OnlineDeviceRow): string {
  const type = getConnectionType(device);
  if (type === 'wired') return '有线';
  if (type === '2.4g') return '2.4 GHz';
  if (type === '5g') return '5 GHz';
  return device.Frequency || device.InterfaceType || '-';
}

export default function OnlineDevicesTable({
  devices,
  loading,
  error,
  onSelect,
}: OnlineDevicesTableProps) {
  const reduce = useReducedMotion();
  const [keyword, setKeyword] = useState('');
  const [connectionFilter, setConnectionFilter] = useState<ConnectionFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('download');

  const visibleDevices = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();
    const result = devices.filter((device) => {
      const matchesKeyword = !normalizedKeyword || [
        device.HostName,
        device.IPAddress,
        device.MACAddress,
        device.Frequency,
        device.InterfaceType,
        device.DeviceBrands,
      ].join(' ').toLocaleLowerCase().includes(normalizedKeyword);
      const matchesConnection = connectionFilter === 'all'
        || getConnectionType(device) === connectionFilter;
      return matchesKeyword && matchesConnection;
    });

    return result.sort((left, right) => {
      switch (sortMode) {
        case 'name':
          return String(left.HostName || '').localeCompare(String(right.HostName || ''), 'zh-CN');
        case 'upload':
          return parseNumber(right.TxKBytes) - parseNumber(left.TxKBytes);
        case 'duration':
          return parseNumber(right.AssociatedTime) - parseNumber(left.AssociatedTime);
        case 'signal':
          return (getSignalValue(right) ?? -999) - (getSignalValue(left) ?? -999);
        case 'download':
        default:
          return parseNumber(right.RxKBytes) - parseNumber(left.RxKBytes);
      }
    });
  }, [connectionFilter, devices, keyword, sortMode]);

  return (
    <Card id="online-devices" className="card-hover scroll-mt-32">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>在线设备</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              搜索终端并按流量、信号或在线时长排序，点击设备查看历史使用情况。
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            显示 {visibleDevices.length} / {devices.length} 台
          </Badge>
        </div>

        {!loading && devices.length > 0 ? (
          <div className="fluid-card-grid gap-2 rounded-2xl border border-border/70 bg-muted/20 p-3 [--fluid-card-min:10rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索名称、IP、MAC 或品牌"
                className="pl-9"
              />
            </div>
            <label className="relative">
              <span className="sr-only">接入方式</span>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <select
                value={connectionFilter}
                onChange={(event) => setConnectionFilter(event.target.value as ConnectionFilter)}
                className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
              >
                <option value="all">全部接入方式</option>
                <option value="2.4g">2.4 GHz</option>
                <option value="5g">5 GHz</option>
                <option value="wired">有线</option>
              </select>
            </label>
            <label>
              <span className="sr-only">排序方式</span>
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
              >
                <option value="download">按下载流量</option>
                <option value="upload">按上传流量</option>
                <option value="duration">按在线时长</option>
                <option value="signal">按信号强度</option>
                <option value="name">按设备名称</option>
              </select>
            </label>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {error ? <div className="mb-4"><Callout tone="danger">{error}</Callout></div> : null}
        {loading ? (
          <TableSkeleton rows={3} />
        ) : devices.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">暂无在线设备</p>
        ) : visibleDevices.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">没有符合当前筛选条件的设备</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {visibleDevices.map((device, index) => {
                const signal = getSignalValue(device);
                return (
                  <motion.button
                    key={device.MACAddress || index}
                    type="button"
                    onClick={() => onSelect(device)}
                    initial={reduce ? undefined : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.04, 0.35), duration: 0.3 }}
                    className="w-full rounded-2xl border border-border/70 bg-muted/20 p-4 text-left transition-colors hover:border-brand/20 hover:bg-muted/40"
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
                    <div className="fluid-card-grid mt-3 gap-2 text-xs text-muted-foreground [--fluid-card-min:8rem]">
                      <span>接入：{getConnectionLabel(device)}</span>
                      <span>信号：{signal === null ? '-' : `${signal} dBm`}</span>
                      <span>下行：{formatBytesFromString(device.RxKBytes, true)}</span>
                      <span>上行：{formatBytesFromString(device.TxKBytes, true)}</span>
                      <span className="col-span-2">时长：{formatDurationFromString(device.AssociatedTime)}</span>
                    </div>
                    <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                      {device.MACAddress || '-'}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>设备名称</TableHead>
                    <TableHead>IP / MAC</TableHead>
                    <TableHead>接入方式</TableHead>
                    <TableHead>信号</TableHead>
                    <TableHead className="text-right">下行流量</TableHead>
                    <TableHead className="text-right">上行流量</TableHead>
                    <TableHead className="text-right">在线时长</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDevices.map((device, index) => {
                    const signal = getSignalValue(device);
                    return (
                      <motion.tr
                        key={device.MACAddress || index}
                        initial={reduce ? undefined : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.035, 0.35), duration: 0.28 }}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => onSelect(device)}
                      >
                        <TableCell className="font-medium">{device.HostName || '未知设备'}</TableCell>
                        <TableCell>
                          <p className="font-mono text-sm">{device.IPAddress || '-'}</p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">{device.MACAddress || '-'}</p>
                        </TableCell>
                        <TableCell>{getConnectionLabel(device)}</TableCell>
                        <TableCell>{signal === null ? '-' : `${signal} dBm`}</TableCell>
                        <TableCell className="text-right">{formatBytesFromString(device.RxKBytes, true)}</TableCell>
                        <TableCell className="text-right">{formatBytesFromString(device.TxKBytes, true)}</TableCell>
                        <TableCell className="text-right">{formatDurationFromString(device.AssociatedTime)}</TableCell>
                        <TableCell>
                          <Badge variant={device.Active ? 'default' : 'secondary'}>
                            {device.Active ? '在线' : '离线'}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
