'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface SwipeableItemProps {
  children: React.ReactNode;
  onCopy?: () => void;
}

const SWIPE_THRESHOLD = -60;

/**
 * Wraps a list item with left-swipe to reveal action buttons.
 * Uses framer-motion drag on x-axis.
 */
export function SwipeableItem({ children, onCopy }: SwipeableItemProps) {
  const x = useMotionValue(0);
  const [swiped, setSwiped] = useState(false);
  const [copied, setCopied] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  const actionOpacity = useTransform(x, [SWIPE_THRESHOLD, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < SWIPE_THRESHOLD) {
      x.set(SWIPE_THRESHOLD);
      setSwiped(true);
    } else {
      x.set(0);
      setSwiped(false);
    }
  };

  const handleCopy = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    x.set(0);
    setSwiped(false);
  };

  return (
    <div ref={constraintsRef} className="relative overflow-hidden rounded-2xl">
      {/* Action layer behind */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center gap-2 pr-4"
        style={{ opacity: actionOpacity }}
      >
        <button
          type="button"
          onClick={handleCopy}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-foreground hover:text-background"
          aria-label="复制内容"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </motion.div>

      {/* Draggable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: SWIPE_THRESHOLD, right: 0 }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10"
        onClick={() => { if (swiped) { x.set(0); setSwiped(false); } }}
      >
        {children}
      </motion.div>
    </div>
  );
}
