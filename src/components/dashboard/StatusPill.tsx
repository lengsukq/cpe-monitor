import type { ReactNode } from 'react';

interface StatusPillProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'success' | 'info' | 'muted';
}

export default function StatusPill({ icon, label, value, tone }: StatusPillProps) {
  const toneClass = tone === 'success'
    ? 'bg-success/10 text-success'
    : tone === 'info'
      ? 'bg-info/10 text-info'
      : 'bg-muted/60 text-muted-foreground';

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-2.5 backdrop-blur-sm sm:gap-3 sm:rounded-2xl sm:p-4">
      <div className={`rounded-full p-2 ${toneClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{label}</p>
        <p className="truncate text-xs font-medium sm:text-sm">{value}</p>
      </div>
    </div>
  );
}
