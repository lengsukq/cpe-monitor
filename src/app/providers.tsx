'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { ThemeColorProvider } from '@/components/ThemeColorProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ThemeColorProvider>
        {children}
      </ThemeColorProvider>
      <Toaster />
    </ThemeProvider>
  );
}
