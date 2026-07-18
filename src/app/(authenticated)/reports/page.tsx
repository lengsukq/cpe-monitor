'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import { Callout } from '@/components/Callout';
import DataTableCard from '@/components/DataTableCard';
import { Button } from '@/components/ui/button';
import { CalendarDays, Download, Signal, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/client-api';
import { formatBytes } from '@/lib/format';
import type { DailyReport, DeviceRanking } from '@/types';

function getQualityVariant(quality: string | null) {
  switch (quality) {
    case '优秀': return 'success' as const;
    case '良好': return 'info' as const;
    case '一般': return 'warning' as const;
    case '差': return 'danger' as const;
    default: return 'secondary' as const;
  }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [previewReport, setPreviewReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<DailyReport[]>('/api/reports/daily', undefined, '获取报告列表失败');
      setReports(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '获取报告列表失败');
    } finally {
      setLoading(false);
    }
  }

  async function generatePreview() {
    setError('');
    try {
      const data = await apiFetch<DailyReport>('/api/reports/daily', { method: 'POST' }, '生成报告失败');
      setPreviewReport(data);
      setIsOpen(true);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : '生成报告失败');
    }
  }

  const topDevices = Array.isArray(previewReport?.topDevices)
    ? (previewReport?.topDevices as DeviceRanking[])
    : [];
  const latestReport = reports[0];

  return (
    <PageShell>
      <PageHeader
        title="每日报告"
        description="汇总每日流量、峰值时段、网络质量与设备使用排名，便于回顾历史运行情况。"
        actions={<Button onClick={() => { void generatePreview(); }}>生成今日预览</Button>}
      />

      <PageOverview
        eyebrow={<><CalendarDays className="h-3.5 w-3.5" />Reports / daily</>}
        title="报告概览"
        description="历史日报规模与最近一天的流量、质量摘要。"
        items={[
          {
            label: '报告天数',
            value: loading ? '…' : String(reports.length),
            detail: '已生成的历史日报',
            icon: <CalendarDays className="h-3.5 w-3.5" />,
          },
          {
            label: '最近日期',
            value: loading ? '…' : (latestReport?.reportDate || '—'),
            detail: latestReport ? `可用性 ${latestReport.uptimePercent?.toFixed(1) || 0}%` : '暂无数据',
            icon: <Wifi className="h-3.5 w-3.5" />,
          },
          {
            label: '最近下载',
            value: loading ? '…' : formatBytes(latestReport?.totalDownload ?? null),
            detail: latestReport ? `上传 ${formatBytes(latestReport.totalUpload)}` : '—',
            icon: <Download className="h-3.5 w-3.5" />,
          },
          {
            label: '最近质量',
            value: loading ? '…' : (latestReport?.networkQuality || '—'),
            detail: latestReport ? `平均信号 ${latestReport.avgSignal || 0} dBm` : '—',
            icon: <Signal className="h-3.5 w-3.5" />,
          },
        ]}
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}

      <DataTableCard
        colSpan={7}
        loading={loading}
        isEmpty={reports.length === 0}
        emptyMessage="暂无报告记录"
        columns={
          <>
            <TableHead>日期</TableHead>
            <TableHead>总下载</TableHead>
            <TableHead>总上传</TableHead>
            <TableHead>峰值时段</TableHead>
            <TableHead>平均信号</TableHead>
            <TableHead>网络质量</TableHead>
            <TableHead>可用性</TableHead>
          </>
        }
      >
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell>{report.reportDate}</TableCell>
            <TableCell>{formatBytes(report.totalDownload)}</TableCell>
            <TableCell>{formatBytes(report.totalUpload)}</TableCell>
            <TableCell>{report.peakHour !== null ? `${report.peakHour}:00` : '-'}</TableCell>
            <TableCell>{report.avgSignal || 0} dBm</TableCell>
            <TableCell>
              <Badge variant={getQualityVariant(report.networkQuality)}>
                {report.networkQuality || '-'}
              </Badge>
            </TableCell>
            <TableCell>{report.uptimePercent?.toFixed(1) || 0}%</TableCell>
          </TableRow>
        ))}
      </DataTableCard>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>今日报告预览</DialogTitle>
          </DialogHeader>
          {previewReport ? (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-muted/70 p-4 text-center">
                  <div className="text-sm text-muted-foreground">总下载</div>
                  <div className="text-xl font-bold text-brand">{formatBytes(previewReport.totalDownload)}</div>
                </div>
                <div className="rounded-2xl bg-muted/70 p-4 text-center">
                  <div className="text-sm text-muted-foreground">总上传</div>
                  <div className="text-xl font-bold text-info">{formatBytes(previewReport.totalUpload)}</div>
                </div>
                <div className="rounded-2xl bg-muted/70 p-4 text-center">
                  <div className="text-sm text-muted-foreground">峰值时段</div>
                  <div className="text-xl font-bold">
                    {previewReport.peakHour !== null ? `${previewReport.peakHour}:00` : '-'}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 font-semibold">设备使用排名</h3>
                {topDevices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>设备名称</TableHead>
                        <TableHead>IP 地址</TableHead>
                        <TableHead>总流量</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topDevices.slice(0, 5).map((device, index) => (
                        <TableRow key={device.mac || index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{device.name}</TableCell>
                          <TableCell>{device.ip}</TableCell>
                          <TableCell>{formatBytes(device.totalBytes)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">暂无设备数据</p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <span className="text-muted-foreground">网络质量: </span>
                  <Badge variant={getQualityVariant(previewReport.networkQuality)}>
                    {previewReport.networkQuality || '-'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">平均信号: </span>
                  <span className="font-medium">{previewReport.avgSignal || 0} dBm</span>
                </div>
                <div>
                  <span className="text-muted-foreground">可用性: </span>
                  <span className="font-medium">{previewReport.uptimePercent?.toFixed(1) || 0}%</span>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
