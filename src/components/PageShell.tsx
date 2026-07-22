import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  /** Form-style pages can narrow content. Default uses full authenticated width. */
  maxWidth?: 'full' | '6xl' | '4xl';
}

const maxWidthClass: Record<NonNullable<PageShellProps['maxWidth']>, string> = {
  full: '',
  '6xl': 'mx-auto max-w-6xl',
  '4xl': 'mx-auto max-w-4xl',
};

export function PageShell({
  children,
  className,
  maxWidth = 'full',
}: PageShellProps) {
  return (
    <div
      className={cn(
        'page-enter space-y-5 sm:space-y-6',
        maxWidthClass[maxWidth],
        className,
      )}
    >
      {children}
    </div>
  );
}
