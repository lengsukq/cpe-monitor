'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker for PWA support.
 * Render once in the root layout.
 */
export function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((error) => {
          console.warn('SW registration failed:', error);
        });
    }
  }, []);

  return null;
}
