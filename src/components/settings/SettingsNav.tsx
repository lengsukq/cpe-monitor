import type { ReactNode } from 'react';

interface SettingsNavProps {
  href: string;
  icon: ReactNode;
  label: string;
  detail: string;
  onClick?: () => void;
}

export function SettingsNav({ href, icon, label, detail, onClick }: SettingsNavProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition hover:bg-muted"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition group-hover:bg-brand/10 group-hover:text-brand">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{detail}</span>
      </span>
    </a>
  );
}

export default SettingsNav;
