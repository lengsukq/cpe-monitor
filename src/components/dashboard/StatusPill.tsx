'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface StatusPillProps {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'success' | 'info' | 'warning' | 'danger' | 'muted';
}

export default function StatusPill({ icon, label, value, tone }: StatusPillProps) {
  const reduce = useReducedMotion();
  const toneClass = tone === 'success'
    ? 'bg-success/10 text-success'
    : tone === 'info'
      ? 'bg-info/10 text-info'
      : tone === 'warning'
        ? 'bg-warning/10 text-warning'
        : tone === 'danger'
          ? 'bg-destructive/10 text-destructive'
      : 'bg-muted/60 text-muted-foreground';

  const inner = (
    <>
      <div className={`rounded-full p-2 ${toneClass}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{label}</p>
        <motion.p
          className="truncate text-xs font-medium sm:text-sm"
          key={value}
          initial={reduce ? undefined : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {value}
        </motion.p>
      </div>
    </>
  );

  return (
    <motion.div
      className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-background/40 p-2.5 backdrop-blur-sm transition-colors duration-200 hover:border-brand/20 sm:gap-3 sm:rounded-2xl sm:p-4"
      layout={reduce ? undefined : 'position'}
    >
      {inner}
    </motion.div>
  );
}
