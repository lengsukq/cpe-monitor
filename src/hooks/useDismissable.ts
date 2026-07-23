'use client';

import { useEffect, type RefObject } from 'react';

/**
 * useDismissable — closes a popup when clicking outside or pressing Escape.
 *
 * Eliminates duplicated event-listener boilerplate across popover components.
 */
export function useDismissable(
  open: boolean,
  setOpen: (open: boolean) => void,
  refs: Array<RefObject<HTMLElement | null>>,
  options?: { lockBodyScroll?: boolean },
): void {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = options?.lockBodyScroll
      ? document.body.style.overflow
      : undefined;
    if (options?.lockBodyScroll) {
      document.body.style.overflow = 'hidden';
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (refs.some((ref) => ref.current?.contains(target))) return;
      setOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      if (options?.lockBodyScroll && previousOverflow !== undefined) {
        document.body.style.overflow = previousOverflow;
      }
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, setOpen, refs, options?.lockBodyScroll]);
}
