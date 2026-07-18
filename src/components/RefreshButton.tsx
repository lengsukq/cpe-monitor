import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RefreshButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  loadingLabel?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs' | 'icon-xs' | 'icon-sm';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive' | 'link';
  className?: string;
}

export default function RefreshButton({
  onClick,
  loading = false,
  label = '刷新',
  loadingLabel = '刷新中',
  size = 'sm',
  variant = 'outline',
  className,
}: RefreshButtonProps) {
  return (
    <Button
      size={size}
      variant={variant}
      onClick={onClick}
      disabled={loading}
      className={className}
    >
      <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
      {loading ? loadingLabel : label}
    </Button>
  );
}
