import { Activity, CalendarDays, CheckCircle2, Download, Eye, Mail, Signal, TrendingUp, UsersRound, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBytes } from '@/lib/format';
import type { DeviceRanking } from '@/types';
import { getReportQualityVariant, type DailyReportPreview } from '../model';
import { DeviceRankingList } from './DeviceRankingList';

interface DailyReportDialogProps {
  open: boolean;
  report: DailyReportPreview | null;
  topDevices: DeviceRanking[];
  onOpenChange: (open: boolean) => void;
}

export function DailyReportDialog({ open, report, topDevices, onOpenChange }: DailyReportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-2xl sm:p-0">
        <DialogHeader className="shrink-0 border-b border-border/60 bg-card px-5 pt-5 pb-4 pr-11 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold sm:text-lg">日报详情</DialogTitle>
              <DialogDescription className="text-xs">{report?.reportDate || ''}</DialogDescription>
            </div>
          </div>
          <div className="mt-2">
            <Badge variant="default" className="gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary hover:bg-primary/15">
              <CalendarDays className="h-3.5 w-3.5" />日报概览
            </Badge>
          </div>
        </DialogHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          {report ? (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-card p-3 text-center"><Download className="mx-auto mb-1.5 h-4 w-4 text-brand" /><div className="text-lg font-bold tabular-nums text-brand sm:text-2xl">{formatBytes(report.totalDownload)}</div><div className="text-xs text-muted-foreground">总下载</div></div>
                <div className="rounded-2xl border border-border/60 bg-card p-3 text-center"><TrendingUp className="mx-auto mb-1.5 h-4 w-4 text-info" /><div className="text-lg font-bold tabular-nums text-info sm:text-2xl">{formatBytes(report.totalUpload)}</div><div className="text-xs text-muted-foreground">总上传</div></div>
                <div className="col-span-2 rounded-2xl border border-border/60 bg-card p-3 text-center sm:col-span-1"><Activity className="mx-auto mb-1.5 h-4 w-4 text-warning" /><div className="text-lg font-bold tabular-nums sm:text-2xl">{report.peakHour !== null ? `${report.peakHour}:00` : '-'}</div><div className="text-xs text-muted-foreground">峰值时段</div></div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-2xl bg-muted/35 p-3"><Activity className="h-4 w-4 text-brand" /><p className="mt-2 text-lg font-bold tabular-nums">{report.sampleCount ?? '—'}</p><p className="text-[10px] text-muted-foreground">采样点</p></div>
                <div className="rounded-2xl bg-muted/35 p-3"><CheckCircle2 className="h-4 w-4 text-success" /><p className="mt-2 text-lg font-bold tabular-nums">{report.successfulCollections ?? '—'}</p><p className="text-[10px] text-muted-foreground">成功采集</p></div>
                <div className="rounded-2xl bg-muted/35 p-3"><UsersRound className="h-4 w-4 text-info" /><p className="mt-2 text-lg font-bold tabular-nums">{report.averageDevices?.toFixed(1) ?? '—'}</p><p className="text-[10px] text-muted-foreground">平均设备数</p></div>
                <div className="rounded-2xl bg-muted/35 p-3"><Signal className="h-4 w-4 text-warning" /><p className="mt-2 text-lg font-bold tabular-nums">{report.alertCount ?? '—'}</p><p className="text-[10px] text-muted-foreground">告警次数</p></div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"><Activity className="h-4 w-4 text-brand" />设备使用排名</h3><DeviceRankingList devices={topDevices} /></div>
              <div className="rounded-2xl border border-border/60 bg-card p-4">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <div className="flex items-center gap-2"><Signal className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">网络质量</span><Badge variant={getReportQualityVariant(report.networkQuality)} className="rounded-full">{report.networkQuality || '-'}</Badge></div>
                  <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">平均信号</span><span className="text-sm font-medium tabular-nums">{report.avgSignal || 0} dBm</span></div>
                  <div className="flex items-center gap-2"><Wifi className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">数据完整率</span><span className="text-sm font-medium tabular-nums">{report.uptimePercent?.toFixed(1) || 0}%</span></div>
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">数据完整率 = 实际采集次数 ÷ 预期采集次数（基于调度间隔计算）。若刚开启调度器或采集时间尚短，完整率偏低属正常现象，随着时间推移会逐步提升。网络质量综合信号强度与数据完整率评定。</p>
              </div>
              {report.notifications ? (
                <div className="rounded-2xl border border-border/70 bg-muted/25 p-4"><div className="flex flex-wrap items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">通知发送</span>
                  {report.notifications.emailSent ? <Badge variant="default" className="gap-1 rounded-full bg-success/10 text-success hover:bg-success/15"><CheckCircle2 className="h-3 w-3" />邮件已发送</Badge> : report.notifications.emailConfigured ? <Badge variant="outline" className="gap-1 rounded-full text-destructive">邮件发送失败</Badge> : null}
                  {report.notifications.wechatSent ? <Badge variant="default" className="gap-1 rounded-full bg-info/10 text-info hover:bg-info/15"><CheckCircle2 className="h-3 w-3" />企微已发送</Badge> : report.notifications.wechatConfigured ? <Badge variant="outline" className="gap-1 rounded-full text-destructive">企微发送失败</Badge> : null}
                  {!report.notifications.emailConfigured && !report.notifications.wechatConfigured ? <span className="text-xs text-muted-foreground/60">未配置通知渠道，请前往设置页配置邮件或企微通知</span> : null}
                </div></div>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="shrink-0 border-t border-border/60 bg-card px-5 py-3.5 sm:flex sm:justify-end sm:px-6"><Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)} variant="outline">关闭</Button></div>
      </DialogContent>
    </Dialog>
  );
}
