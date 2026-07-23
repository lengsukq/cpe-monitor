'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Bell, Settings, Smartphone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function QuickLink({
  href,
  icon,
  label,
  description,
  index,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  description: string;
  index: number;
}) {
  const reduce = useReducedMotion();

  const card = (
    <Card className="group h-full cursor-pointer py-0 shadow-card transition-[border-color] duration-200 hover:border-brand/25">
      <CardContent className="flex min-h-20 items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="shrink-0 rounded-xl bg-muted p-3 transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{label}</p>
          <p className="truncate text-sm text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
      </CardContent>
    </Card>
  );

  if (reduce) {
    return <Link href={href} className="block h-full min-w-0">{card}</Link>;
  }

  return (
    <motion.div
      className="h-full min-w-0"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.07, duration: 0.35 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Link href={href} className="block h-full min-w-0">{card}</Link>
    </motion.div>
  );
}

export default function QuickLinks() {
  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
      <QuickLink index={0} href="/device" icon={<Smartphone className="h-5 w-5" />} label="设备详情" description="查看设备信息、在线设备" />
      <QuickLink index={1} href="/alerts" icon={<Bell className="h-5 w-5" />} label="告警规则" description="管理流量告警阈值" />
      <QuickLink index={2} href="/settings" icon={<Settings className="h-5 w-5" />} label="系统设置" description="CPE 连接、通知配置" />
    </div>
  );
}
