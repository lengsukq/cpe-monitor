'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { staggerContainer, fadeUp } from '@/components/motion';

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
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={cn('space-y-3 sm:space-y-5 lg:space-y-6', maxWidthClass[maxWidth], className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn('space-y-3 sm:space-y-5 lg:space-y-6', maxWidthClass[maxWidth], className)}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div key={index} variants={fadeUp}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={fadeUp}>{children}</motion.div>}
    </motion.div>
  );
}
