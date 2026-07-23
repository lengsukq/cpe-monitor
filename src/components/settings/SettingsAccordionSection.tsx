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
      <div className="flex flex-col gap-2.5 border-b border-border/60 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand/10 text-brand sm:h-8 sm:w-8 sm:rounded-xl">
              {icon}
            </span>
            {eyebrow}
          </p>
          <h3 className="mt-1 text-sm font-semibold tracking-tight sm:mt-2 sm:text-lg">{title}</h3>
          {description ? (
            <p className="mt-0.5 hidden text-xs leading-5 text-muted-foreground sm:mt-1 sm:block">{description}</p>
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
            <CardContent className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 sm:gap-x-5 sm:gap-y-1">
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
            <CardContent id={`${id}-panel`} className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
              {children}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default SettingsAccordionSection;
