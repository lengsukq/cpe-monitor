import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, Settings, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function QuickLink({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="card-hover group h-full cursor-pointer py-0">
        <CardContent className="flex min-h-20 items-center gap-4 p-4">
          <div className="shrink-0 rounded-xl bg-muted p-3 transition-colors group-hover:bg-primary/10">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{label}</p>
            <p className="truncate text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function QuickLinks() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <QuickLink href="/device" icon={<Smartphone className="h-5 w-5" />} label="设备详情" description="查看设备信息、在线设备" />
      <QuickLink href="/alerts" icon={<Bell className="h-5 w-5" />} label="告警规则" description="管理流量告警阈值" />
      <QuickLink href="/settings" icon={<Settings className="h-5 w-5" />} label="系统设置" description="CPE 连接、通知配置" />
    </div>
  );
}
