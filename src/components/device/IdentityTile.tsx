import type { ReactNode } from 'react';

interface IdentityTileProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  mono?: boolean;
}

export default function IdentityTile({ icon, label, value, mono }: IdentityTileProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-muted/35 px-4 py-3 transition hover:border-brand/20 hover:bg-muted/55">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="text-brand">{icon}</span>{label}
      </p>
      <p className={`mt-1 truncate text-sm font-bold text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
