import type { ReactNode } from 'react';

interface IdentityTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  mono?: boolean;
}

export default function IdentityTile({ icon, label, value, mono }: IdentityTileProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 backdrop-blur-sm">
      <p className="flex items-center gap-2 text-xs text-white/65">{icon}{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold text-white ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
