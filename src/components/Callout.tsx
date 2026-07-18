import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalloutTone = 'warning' | 'danger' | 'info' | 'success';

interface CalloutProps {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

const toneStyles: Record<
  CalloutTone,
  { container: string; icon: ReactNode }
> = {
  warning: {
    container: 'border-warning/30 bg-warning/10 text-foreground',
    icon: <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />,
  },
  danger: {
    container: 'border-danger/30 bg-danger/10 text-foreground',
    icon: <XCircle className="h-4 w-4 shrink-0 text-danger" aria-hidden />,
  },
  info: {
    container: 'border-info/30 bg-info/10 text-foreground',
    icon: <Info className="h-4 w-4 shrink-0 text-info" aria-hidden />,
  },
  success: {
    container: 'border-success/30 bg-success/10 text-foreground',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />,
  },
};

export function Callout({
  tone = 'info',
  title,
  children,
  className,
}: CalloutProps) {
  const styles = toneStyles[tone];

  return (
    <div
      role="status"
      className={cn(
        'flex gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm',
        styles.container,
        className,
      )}
    >
      <div className="mt-0.5">{styles.icon}</div>
      <div className="min-w-0 flex-1">
        {title ? <p className="font-medium leading-5">{title}</p> : null}
        <div className={cn(title ? 'mt-1 text-muted-foreground leading-6' : 'leading-6')}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Callout;
