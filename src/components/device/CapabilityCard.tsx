import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface CapabilityCardProps {
  icon: ReactNode;
  label: string;
  value: string;
}

export default function CapabilityCard({ icon, label, value }: CapabilityCardProps) {
  return (
    <Card className="card-hover">
      <CardContent className="flex min-h-20 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-3 lg:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
          <p className="min-w-0 flex-1 text-sm leading-5 text-muted-foreground sm:hidden">
            {label}
          </p>
        </div>
        <p className="hidden min-w-0 flex-1 text-sm leading-5 text-muted-foreground sm:block">
          {label}
        </p>
        <p className="break-words text-sm font-semibold leading-5 text-foreground sm:max-w-[50%] sm:truncate sm:text-right">
          {value || '-'}
        </p>
      </CardContent>
    </Card>
  );
}
