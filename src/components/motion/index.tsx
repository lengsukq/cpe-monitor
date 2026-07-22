'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from 'framer-motion';
import { cn } from '@/lib/utils';

/* ─── Shared variants ─────────────────────────────────────────────── */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ─── PageTransition ──────────────────────────────────────────────── */

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/** Wraps page content with enter/exit transitions for AnimatePresence. */
export function PageTransition({ children, className }: PageTransitionProps) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── MotionCard ──────────────────────────────────────────────────── */

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  /** Index for stagger delay when not using a stagger parent. */
  delay?: number;
}

/** Card wrapper with hover lift + tap feedback + entrance animation. */
export function MotionCard({ children, className, delay = 0 }: MotionCardProps) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
    >
      {children}
    </motion.div>
  );
}

/* ─── ScrollReveal ────────────────────────────────────────────────── */

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds before the reveal animation starts once in view. */
  delay?: number;
}

/** Reveals content with a fade-up when it scrolls into the viewport. */
export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── AnimatedCounter ─────────────────────────────────────────────── */

interface AnimatedCounterProps {
  value: number;
  className?: string;
  /** Number of decimals to display. */
  decimals?: number;
  /** Duration of the counting animation in seconds. */
  duration?: number;
  /** Optional prefix/suffix rendered around the number. */
  prefix?: string;
  suffix?: string;
}

/** Animates a number from its previous value to the new value. */
export function AnimatedCounter({
  value,
  className,
  decimals = 0,
  duration = 0.8,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const previousValue = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduce) {
      previousValue.current = value;
      return;
    }

    const from = previousValue.current;
    previousValue.current = value;
    if (from === value) return;

    let raf: number;
    const start = performance.now();
    const durationMs = duration * 1000;

    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (value - from) * eased;
      if (node) {
        node.textContent = `${prefix}${current.toFixed(decimals)}${suffix}`;
      }
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, decimals, duration, prefix, suffix, reduce]);

  if (reduce) {
    return (
      <span ref={ref} className={className}>
        {prefix}{value.toFixed(decimals)}{suffix}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
}

/* ─── StaggerGroup ────────────────────────────────────────────────── */

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
}

/** Parent that staggers its motion children entrances. */
export function StaggerGroup({ children, className }: StaggerGroupProps) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

/* ─── StaggerItem ─────────────────────────────────────────────────── */

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

/** Child of StaggerGroup — fades up in sequence. */
export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}

/* ─── PulseDot ────────────────────────────────────────────────────── */

interface PulseDotProps {
  className?: string;
  tone?: 'success' | 'warning' | 'danger' | 'brand';
}

const pulseToneClass: Record<NonNullable<PulseDotProps['tone']>, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  brand: 'bg-brand',
};

/** Breathing status dot with a ping ring. */
export function PulseDot({ className, tone = 'success' }: PulseDotProps) {
  return (
    <span className={cn('relative inline-flex size-2.5', className)}>
      <span className={cn('absolute inline-flex size-full animate-ping rounded-full opacity-50', pulseToneClass[tone])} />
      <span className={cn('relative inline-flex size-2.5 rounded-full', pulseToneClass[tone])} />
    </span>
  );
}
