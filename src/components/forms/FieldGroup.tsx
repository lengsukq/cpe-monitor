'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CircleAlert } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface FieldGroupProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export default function FieldGroup({ label, hint, error, children }: FieldGroupProps) {
  const reduce = useReducedMotion();
  return (
    <div className="group/field space-y-1.5">
      <Label className="text-sm font-medium transition-colors duration-200 group-focus-within/field:text-brand">
        {label}
      </Label>
      {children}
      {hint && !error ? (
        <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p>
      ) : null}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="field-error"
            initial={reduce ? undefined : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1 text-[11px] leading-4 text-destructive"
            role="alert"
          >
            <CircleAlert className="h-3 w-3 shrink-0" aria-hidden />
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
