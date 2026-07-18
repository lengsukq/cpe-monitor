'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

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
        <div className="glass fixed left-0 right-0 top-0 z-50 border-b">
          <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 lg:px-8">
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
        <main className="mx-auto max-w-screen-2xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-9 w-48 rounded-xl" />
              <Skeleton className="h-4 w-72 max-w-full rounded-lg" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      <main className="mx-auto max-w-screen-2xl px-4 pt-24 sm:px-6 lg:px-8 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
