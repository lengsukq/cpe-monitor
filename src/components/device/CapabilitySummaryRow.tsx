import { motion, useReducedMotion } from 'framer-motion';
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
  const reduce = useReducedMotion();
  const cards = [
    { icon: <Cpu className="h-5 w-5" />, label: '厂商/型号', value: [vendor, deviceName].filter(Boolean).join(' / ') || '-' },
    { icon: <Wifi className="h-5 w-5" />, label: '双频优选', value: formatFeatureState(wlanDbho) },
    { icon: <Network className="h-5 w-5" />, label: '拓扑状态', value: formatFeatureState(topology) },
    { icon: <ActivityDot />, label: '在线终端', value: `${countTopology(topology)} 台` },
  ];
  return (
    <div className="fluid-card-grid gap-3 [--fluid-card-min:14rem] lg:gap-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={reduce ? undefined : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 + index * 0.06, ease: 'easeOut' }}
          whileHover={reduce ? undefined : { y: -3 }}
        >
          <CapabilityCard icon={card.icon} label={card.label} value={card.value} />
        </motion.div>
      ))}
    </div>
  );
}
