'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DailyReport {
  id: number;
  reportDate: string;
  totalUpload: number | null;
  totalDownload: number | null;
  peakHour: number | null;
  topDevices: any[] | null;
  avgSignal: number | null;
  uptimePercent: number | null;
  networkQuality: string | null;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [previewReport, setPreviewReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports/daily');
      const data = await res.json();
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    try {
      const res = await fetch('/api/reports/daily', { method: 'POST' });
      const data = await res.json();
      setPreviewReport(data);
      setIsOpen(true);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getQualityVariant = (quality: string | null) => {
    switch (quality) {
      case '优秀': return 'default' as const;
      case '良好': return 'secondary' as const;
      case '一般': return 'outline' as const;
      case '差': return 'destructive' as const;
      default: return 'secondary' as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">每日报告</h1>
        <Button onClick={generatePreview}>生成今日预览</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>总下载</TableHead>
                  <TableHead>总上传</TableHead>
                  <TableHead>峰值时段</TableHead>
                  <TableHead>平均信号</TableHead>
                  <TableHead>网络质量</TableHead>
                  <TableHead>可用性</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">暂无报告记录</TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>今日报告预览</DialogTitle>
          </DialogHeader>
          {previewReport && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">总下载</div>
                  <div className="text-xl font-bold text-blue-600">{formatBytes(previewReport.totalDownload)}</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">总上传</div>
                  <div className="text-xl font-bold text-purple-600">{formatBytes(previewReport.totalUpload)}</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">峰值时段</div>
                  <div className="text-xl font-bold">{previewReport.peakHour !== null ? `${previewReport.peakHour}:00` : '-'}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">设备使用排名</h3>
                {previewReport.topDevices && previewReport.topDevices.length > 0 ? (
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
                      {previewReport.topDevices.slice(0, 5).map((device: any, index: number) => (
                        <TableRow key={device.mac}>
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
          )}
          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
