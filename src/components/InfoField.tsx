import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface InfoFieldProps {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

function decodeDisplayValue(value: string) {
  return value
    .replace(/&#40;/g, '(')
    .replace(/&#41;/g, ')')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export default function InfoField({
  label,
  value,
  mono = false,
  size = 'md',
  className,
}: InfoFieldProps) {
  let displayValue: ReactNode = '-';
  if (value !== null && value !== undefined && value !== '') {
    displayValue = typeof value === 'string' ? decodeDisplayValue(value) : value;
  }

  return (
    <div className={cn('w-full min-w-0 space-y-1 overflow-hidden rounded-2xl border border-border/55 bg-muted/30 p-3', className)}>
      <p className={cn('font-medium text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>{label}</p>
      <p className={cn(
        'min-w-0 break-words font-semibold text-foreground',
        mono ? 'font-mono text-sm' : '',
        size === 'sm' ? 'text-sm' : '',
      )}>
        {displayValue}
      </p>
    </div>
  );
}
