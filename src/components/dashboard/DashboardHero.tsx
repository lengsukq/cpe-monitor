import Link from 'next/link';
import { ArrowRight, CheckCircle2, Gauge, MessageSquareText, Radio, Smartphone, Wifi } from 'lucide-react';
import { PageOverview } from '@/components/PageOverview';
import { getCarrier } from '@/lib/format';

interface DashboardHeroProps {
  isConnected: boolean;
  source?: string;
  connectedDevices: number;
  cellId?: string;
  networkType?: string;
  carrierCode?: string;
  signalStrength?: number;
  signalLabel?: string;
  smsSyncLabel: string;
  smsSyncDetail: string;
  deviceName?: string;
  className?: string;
}

export default function DashboardHero({
  isConnected,
  source,
  connectedDevices,
  cellId,
  networkType,
  carrierCode,
  signalStrength,
  signalLabel,
  smsSyncLabel,
  smsSyncDetail,
  deviceName,
  className,
}: DashboardHeroProps) {
  return (
    <PageOverview
      className={className}
      eyebrow={<><Gauge className="h-3.5 w-3.5" />CPE / runtime summary</>}
      title="运行摘要"
      description="把设备、网络、信号、终端和短信同步状态收拢在一处，方便快速判断当前是否需要处理。"
      actions={
        <Link
          href="/device"
          className="inline-flex w-fit items-center gap-1.5 rounded-2xl border border-border bg-muted/45 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
        >
          查看设备详情
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
      items={[
        {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          label: 'CPE 连接',
          value: isConnected ? '已连接' : '未连接/未知',
          detail: source === 'cpe' ? '实时数据' : '数据库兜底',
          href: '/device',
        },
        {
          icon: <Smartphone className="h-3.5 w-3.5" />,
          label: '在线终端',
          value: `${connectedDevices || 0} 台`,
          detail: '点击查看在线列表',
          href: '/device#online-devices',
        },
        {
          icon: <Radio className="h-3.5 w-3.5" />,
          label: '当前小区',
          value: cellId || '-',
          detail: `${networkType || '网络未知'} · ${getCarrier(String(carrierCode || ''))}`,
          href: '/device',
        },
        {
          icon: <Wifi className="h-3.5 w-3.5" />,
          label: '信号强度',
          value: signalStrength ? `${signalStrength} dBm` : '-',
          detail: signalLabel || '等待数据',
          href: '/device',
        },
        {
          icon: <MessageSquareText className="h-3.5 w-3.5" />,
          label: '短信同步',
          value: smsSyncLabel,
          detail: smsSyncDetail,
          href: '/sms',
        },
      ]}
      footer={
        <p className="relative mt-4 truncate text-[10px] text-muted-foreground sm:text-xs">
          设备型号：{deviceName || '-'} · 每 5 秒自动刷新实时状态
        </p>
      }
    />
  );
}
