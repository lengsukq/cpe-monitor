import type { ReactNode } from 'react';
import HeroSection from '@/components/HeroSection';
import HeroStatTile from '@/components/HeroStatTile';

export interface PageOverviewItem {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  href?: string;
  mono?: boolean;
  chart?: ReactNode;
  toneClassName?: string;
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
          <div className="fluid-card-grid gap-2 [--fluid-card-min:12.5rem] sm:gap-3">
            {items.map((item) => (
              <HeroStatTile
                key={item.label}
                icon={item.icon}
                label={item.label}
                value={item.value}
                detail={item.detail}
                href={item.href}
                mono={item.mono}
                chart={item.chart}
                className={item.toneClassName}
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
