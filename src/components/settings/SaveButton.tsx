'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SaveButtonProps {
  saving: boolean;
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * Save button with success micro-feedback:
 * spinner while saving → green check flash on success → back to normal.
 */
export function SaveButton({ saving, onClick, label = '保存', className }: SaveButtonProps) {
  const reduce = useReducedMotion();
  const [saved, setSaved] = useState(false);
  const prevSaving = useRef(false);

  useEffect(() => {
    if (prevSaving.current && !saving) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 1600);
      prevSaving.current = saving;
      return () => clearTimeout(timer);
    }
    prevSaving.current = saving;
  }, [saving]);

  return (
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      disabled={saving}
      className={className}
      style={saved ? { backgroundColor: 'var(--success)', color: '#fff' } : undefined}
    >
      <AnimatePresence mode="wait" initial={false}>
        {saving ? (
          <motion.span
            key="saving"
            className="inline-flex items-center gap-1.5"
            initial={reduce ? undefined : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            保存中
          </motion.span>
        ) : saved ? (
          <motion.span
            key="saved"
            className="inline-flex items-center gap-1.5"
            initial={reduce ? undefined : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Check className="h-3.5 w-3.5" />
            已保存
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            className="inline-flex items-center gap-1.5"
            initial={reduce ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Save className="h-3.5 w-3.5" />
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}

export default SaveButton;
