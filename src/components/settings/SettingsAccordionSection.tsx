'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SettingsSummaryRow {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

interface SettingsAccordionSectionProps {
  id: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
  /** Always-visible status chip on the right of the header. */
  status?: ReactNode;
  summary: SettingsSummaryRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function SettingsAccordionSection({
  id,
  icon,
  eyebrow,
  title,
  description,
  status,
  summary,
  open,
  onOpenChange,
  children,
  className,
}: SettingsAccordionSectionProps) {
  const reduce = useReducedMotion();
  const spring = { type: 'spring' as const, stiffness: 320, damping: 32 };
  return (
    <Card
      id={id}
      className={cn(
        'scroll-mt-32 overflow-hidden transition-shadow duration-200',
        open && 'ring-1 ring-brand/15',
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
              {icon}
            </span>
            {eyebrow}
          </p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {status}
          <Button
            type="button"
            size="sm"
            variant={open ? 'outline' : 'default'}
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            aria-controls={`${id}-panel`}
          >
            {open ? (
              <>
                <X className="mr-1.5 h-3.5 w-3.5" />
                收起
              </>
            ) : (
              <>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                修改
              </>
            )}
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={reduce ? { duration: 0 } : spring}
              className="ml-1 inline-flex"
            >
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </motion.span>
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {!open ? (
          <motion.div
            key="summary"
            initial={reduce ? undefined : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={reduce ? { duration: 0 } : spring}
            className="overflow-hidden"
          >
            <CardContent className="px-5 py-4 sm:px-6">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {summary.map((row) => (
                  <div key={row.label} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{row.label}:</span>{' '}
                    <span className={cn(row.mono && 'font-mono')}>{row.value || '—'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={reduce ? undefined : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={reduce ? { duration: 0 } : spring}
            className="overflow-hidden"
          >
            <CardContent id={`${id}-panel`} className="space-y-4 px-5 py-5 sm:px-6">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default SettingsAccordionSection;
