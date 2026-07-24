'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportCsvButtonProps {
  href: string;
  label?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
}

/**
 * Triggers a CSV download via the given API href.
 * Uses a temporary anchor element to initiate the browser download.
 */
export function ExportCsvButton({ href, label = '导出 CSV', size = 'sm', variant = 'outline' }: ExportCsvButtonProps) {
  const handleExport = () => {
    const a = document.createElement('a');
    a.href = href;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Button size={size} variant={variant} onClick={handleExport}>
      <Download className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
