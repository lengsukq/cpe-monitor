'use client';

import type { ReactNode } from 'react';
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
  return (
    <Card
      id={id}
      className={cn(
        'scroll-mt-24 overflow-hidden border-border/70 shadow-sm transition-shadow duration-200',
        open && 'ring-1 ring-brand/15',
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-foreground">
              {icon}
            </span>
            {eyebrow}
          </p>
          <h3 className="mt-1 text-base font-medium tracking-tight">{title}</h3>
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
            <ChevronDown
              className={cn(
                'ml-1 h-3.5 w-3.5 transition-transform duration-200',
                open && 'rotate-180',
              )}
              aria-hidden
            />
          </Button>
        </div>
      </div>

      {!open ? (
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {summary.map((row) => (
              <div key={row.label} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{row.label}:</span>{' '}
                <span className={cn(row.mono && 'font-mono')}>{row.value || '—'}</span>
              </div>
            ))}
          </div>
        </CardContent>
      ) : (
        <CardContent id={`${id}-panel`} className="space-y-3.5 px-4 py-4">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

export default SettingsAccordionSection;