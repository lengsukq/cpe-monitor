import { Phone, Radio, Router, ShieldCheck } from 'lucide-react';
import IdentityTile from '@/components/device/IdentityTile';
import { getCarrier } from '@/lib/format';

interface DeviceIdentityHeroProps {
  info: {
    spreadname_zh?: string;
    spreadname_en?: string;
    DeviceName?: string;
    Mccmnc?: string;
    Msisdn?: string;
    Iccid?: string;
  };
  cell?: {
    networkType?: string;
    cellId?: string;
  } | null;
}

export default function DeviceIdentityHero({ info, cell }: DeviceIdentityHeroProps) {
  return (
    <section className="app-panel relative overflow-hidden px-6 py-7 lg:px-8">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-24 w-72 rounded-full bg-info/5 blur-3xl" />
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] xl:items-end">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand/80">
            <Router className="h-4 w-4" />
            CPE identity console
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
            {info.spreadname_zh || info.spreadname_en || info.DeviceName}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {getCarrier(String(info.Mccmnc || ''))} · {cell?.networkType || '网络状态读取中'} · {info.DeviceName}
          </p>
        </div>
        <div className="fluid-card-grid min-w-0 gap-3 [--fluid-card-min:11rem]">
          <IdentityTile icon={<Phone className="h-4 w-4" />} label="SIM 手机号" value={info.Msisdn || '未返回'} />
          <IdentityTile icon={<Radio className="h-4 w-4" />} label="当前小区" value={cell?.cellId || '未返回'} mono />
          <IdentityTile icon={<ShieldCheck className="h-4 w-4" />} label="ICCID" value={info.Iccid || '未返回'} mono />
        </div>
      </div>
    </section>
  );
}
