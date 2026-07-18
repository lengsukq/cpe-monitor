import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface FieldGroupProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

export default function FieldGroup({ label, hint, children }: FieldGroupProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] leading-4 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
