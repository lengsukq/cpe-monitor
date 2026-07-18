import type { ReactNode } from 'react';
import HeroSection from '@/components/HeroSection';
import HeroStatTile from '@/components/HeroStatTile';
import { cn } from '@/lib/utils';

export interface PageOverviewItem {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  href?: string;
  mono?: boolean;
}

interface PageOverviewProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  items: PageOverviewItem[];
  footer?: ReactNode;
  className?: string;
}

function statsGridClass(itemCount: number) {
  if (itemCount <= 1) return 'grid-cols-1';
  if (itemCount === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (itemCount === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  if (itemCount === 5) return 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5';
  return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4';
}

export function PageOverview({
  eyebrow,
  title,
  description,
  actions,
  items,
  footer,
  className,
}: PageOverviewProps) {
  if (items.length === 0 && !title) return null;

  return (
    <HeroSection
      className={className}
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
      stats={
        items.length > 0 ? (
          <div className={cn('grid gap-2 sm:gap-3', statsGridClass(items.length))}>
            {items.map((item) => (
              <HeroStatTile
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
                detail={item.detail}
                href={item.href}
                mono={item.mono}
              />
            ))}
          </div>
        ) : undefined
      }
    >
      {footer}
    </HeroSection>
  );
}

export default PageOverview;
