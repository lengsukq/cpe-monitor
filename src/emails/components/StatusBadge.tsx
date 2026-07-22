import type { EmailTone } from './Header';
import { emailTheme } from './Layout';

interface StatusBadgeProps {
  children: React.ReactNode;
  tone?: EmailTone;
}

function getColors(tone: EmailTone) {
  switch (tone) {
    case 'success':
      return { background: emailTheme.successSoft, color: emailTheme.success, border: '#bbf7d0' };
    case 'warning':
      return { background: emailTheme.warningSoft, color: emailTheme.warning, border: '#fed7aa' };
    case 'danger':
      return { background: emailTheme.dangerSoft, color: emailTheme.danger, border: '#fecaca' };
    case 'info':
      return { background: emailTheme.infoSoft, color: emailTheme.info, border: '#bfdbfe' };
    default:
      return { background: emailTheme.surfaceMuted, color: emailTheme.muted, border: emailTheme.border };
  }
}

export default function StatusBadge({ children, tone = 'neutral' }: StatusBadgeProps) {
  const colors = getColors(tone);
  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: '999px',
        color: colors.color,
        fontSize: '11px',
        fontWeight: 700,
        lineHeight: '1',
        padding: '6px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
