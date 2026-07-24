import {
  BellRing,
  Database,
  DatabaseBackup,
  Gauge,
  HardDrive,
  KeyRound,
  Mail,
  MessageSquareText,
  Palette,
  RefreshCw,
  ScrollText,
  Wifi,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { getUpdateStateLabel } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SettingsSectionId, UpdateStatusState } from '@/features/settings/types';

interface SettingsSidebarProps {
  updateStatus: UpdateStatusState | null;
  checkingUpdate: boolean;
  onOpenSection: (section: SettingsSectionId) => void;
  onRefreshUpdate: () => void;
  onCheckUpdate: () => void;
  className?: string;
}

export function SettingsSidebar({
  updateStatus,
  checkingUpdate,
  onOpenSection,
  onRefreshUpdate,
  onCheckUpdate,
  className,
}: SettingsSidebarProps) {
  return (
    <aside className={cn('space-y-4 lg:sticky lg:top-28', className)}>
      <Card className="overflow-hidden">
        <CardContent className="fluid-card-grid gap-1 p-2 [--fluid-card-min:9rem] lg:block">
          <p className="col-span-full px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            配置导航
          </p>
          <SettingsNav
            href="#theme-color"
            icon={<Palette className="h-3.5 w-3.5" />}
            label="主题色"
            detail="外观定制"
          />
          <SettingsNav
            href="#connection"
            icon={<Wifi className="h-3.5 w-3.5" />}
            label="设备连接"
            detail="地址与凭据"
            onClick={() => onOpenSection('connection')}
          />
          <SettingsNav
            href="#automation"
            icon={<MessageSquareText className="h-3.5 w-3.5" />}
            label="自动化"
            detail="短信同步"
            onClick={() => onOpenSection('automation')}
          />
          <SettingsNav
            href="#device-info-sync"
            icon={<HardDrive className="h-3.5 w-3.5" />}
            label="设备信息"
            detail="长期入库"
            onClick={() => onOpenSection('deviceInfo')}
          />
          <SettingsNav
            href="#retention"
            icon={<Database className="h-3.5 w-3.5" />}
            label="数据保留"
            detail="自动清理"
            onClick={() => onOpenSection('retention')}
          />
          <SettingsNav
            href="#data-quota"
            icon={<Gauge className="h-3.5 w-3.5" />}
            label="流量配额"
            detail="预算告警"
            onClick={() => onOpenSection('quota')}
          />
          <SettingsNav
            href="#email"
            icon={<Mail className="h-3.5 w-3.5" />}
            label="邮件通知"
            detail="SMTP"
            onClick={() => onOpenSection('email')}
          />
          <SettingsNav
            href="#wechat"
            icon={<BellRing className="h-3.5 w-3.5" />}
            label="企业微信"
            detail="Webhook"
            onClick={() => onOpenSection('wechat')}
          />
          <SettingsNav
            href="#data-backup"
            icon={<DatabaseBackup className="h-3.5 w-3.5" />}
            label="数据备份"
            detail="备份/恢复"
          />
          <SettingsNav
            href="/settings/logs"
            icon={<ScrollText className="h-3.5 w-3.5" />}
            label="系统日志"
            detail="运行记录"
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-warning/20">
        <CardHeader className="space-y-0 p-2.5 pb-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
                <Wrench className="h-3.5 w-3.5" />
              </span>
              <CardTitle className="text-sm font-medium">系统维护</CardTitle>
            </div>
            <Badge variant={updateStatus?.error ? 'secondary' : 'outline'} className="rounded-full text-[10px]">
              {getUpdateStateLabel(updateStatus?.updateState)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 p-3 pt-0">
          <p className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs leading-5 text-muted-foreground">
            {updateStatus?.error || updateStatus?.message || '手动检查在线升级，不会自动写入 CPE。'}
          </p>
          <div className="fluid-card-grid gap-1.5 [--fluid-card-min:7rem]">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRefreshUpdate}>
              <RefreshCw className="mr-1 h-3 w-3" />刷新
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={onCheckUpdate} disabled={checkingUpdate}>
              {checkingUpdate ? '检查中…' : '检查更新'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

export default SettingsSidebar;
