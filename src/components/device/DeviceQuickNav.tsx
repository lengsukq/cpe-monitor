'use client';

import { useEffect, useState, type ComponentType } from 'react';
import {
  Cpu,
  Database,
  Fingerprint,
  Gauge,
  RadioTower,
  ShieldCheck,
  Signal,
  UsersRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeviceNavItem {
  id: string;
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}

const items: DeviceNavItem[] = [
  {
    id: 'device-overview',
    label: '设备概览',
    detail: '身份、型号与当前小区',
    icon: Gauge,
  },
  {
    id: 'device-signal',
    label: '射频质量',
    detail: 'RSRP、RSRQ、SINR、RSSI',
    icon: Signal,
  },
  {
    id: 'device-system',
    label: '系统与版本',
    detail: '基础信息、固件和硬件',
    icon: Cpu,
  },
  {
    id: 'device-cellular',
    label: '蜂窝网络',
    detail: '注册状态与 5G 射频参数',
    icon: RadioTower,
  },
  {
    id: 'device-identifiers',
    label: '标识与地址',
    detail: 'IMEI、MAC、WAN 和 DNS',
    icon: Fingerprint,
  },
  {
    id: 'device-capabilities',
    label: '能力与服务',
    detail: 'Wi-Fi、USB、Portal 与 IoT',
    icon: ShieldCheck,
  },
  {
    id: 'device-raw',
    label: '原始数据',
    detail: '查看 CPE 接口完整响应',
    icon: Database,
  },
  {
    id: 'online-devices',
    label: '在线设备',
    detail: '终端列表与设备历史',
    icon: UsersRound,
  },
];

export default function DeviceQuickNav() {
  const [activeId, setActiveId] = useState(items[0].id);

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveId(visibleEntry.target.id);
        }
      },
      {
        rootMargin: '-120px 0px -65% 0px',
        threshold: [0.05, 0.2, 0.5],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  function navigateTo(id: string) {
    const element = document.getElementById(id);
    if (!element) return;

    setActiveId(id);
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  }

  return (
    <aside className="lg:sticky lg:top-28">
      <div className="app-panel overflow-hidden p-2 lg:p-3">
        <div className="hidden px-3 pb-2 pt-1 lg:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            设备导航
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            快速定位设备状态、网络参数和在线终端。
          </p>
        </div>

        <nav
          aria-label="设备页面快速导航"
          className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
        >
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'group flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition lg:w-full lg:gap-3',
                  active
                    ? 'bg-brand text-primary-foreground shadow-sm'
                    : 'bg-muted/35 text-foreground hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-xl transition lg:size-9',
                    active
                      ? 'bg-white/15 text-primary-foreground'
                      : 'bg-background text-muted-foreground shadow-sm group-hover:text-brand',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block whitespace-nowrap text-xs font-bold lg:text-sm">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      'hidden truncate text-[11px] lg:block',
                      active ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {item.detail}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
