import { Cpu, Network, Wifi } from 'lucide-react';
import CapabilityCard from '@/components/device/CapabilityCard';
import ActivityDot from '@/components/device/ActivityDot';
import { countTopology, formatFeatureState } from '@/lib/device-display';

interface CapabilitySummaryRowProps {
  vendor?: string;
  deviceName?: string;
  wlanDbho?: unknown;
  topology?: unknown;
}

export default function CapabilitySummaryRow({
  vendor,
  deviceName,
  wlanDbho,
  topology,
}: CapabilitySummaryRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:gap-4 xl:grid-cols-4">
      <CapabilityCard
        icon={<Cpu className="h-5 w-5" />}
        label="厂商/型号"
        value={[vendor, deviceName].filter(Boolean).join(' / ') || '-'}
      />
      <CapabilityCard
        icon={<Wifi className="h-5 w-5" />}
        label="双频优选"
        value={formatFeatureState(wlanDbho)}
      />
      <CapabilityCard
        icon={<Network className="h-5 w-5" />}
        label="拓扑状态"
        value={formatFeatureState(topology)}
      />
      <CapabilityCard
        icon={<ActivityDot />}
        label="在线终端"
        value={`${countTopology(topology)} 台`}
      />
    </div>
  );
}
