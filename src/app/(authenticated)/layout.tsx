'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { TopNav } from '@/components/TopNav';
import { PageTransition } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 lg:px-7">
          <div className="glass mx-auto flex h-[76px] max-w-screen-2xl items-center justify-between rounded-3xl px-4 shadow-card">
            <div className="flex items-center gap-6">
              <Skeleton className="h-6 w-20 rounded-lg" />
              <div className="hidden gap-2 md:flex">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-16 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-9 w-16 rounded-xl" />
            </div>
          </div>
        </div>
        <main className="mx-auto max-w-screen-2xl px-3 pb-10 pt-28 sm:px-5 lg:px-7">
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-9 w-48 rounded-xl" />
              <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
            </div>
            <div className="fluid-card-grid gap-4 [--fluid-card-min:15rem]">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">加载中…</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-screen-2xl px-3 pt-28 sm:px-5 lg:px-7 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </main>
    </div>
  );
}
