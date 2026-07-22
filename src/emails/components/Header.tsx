import { Section, Text } from '@react-email/components';
import { emailTheme } from './Layout';

export type EmailTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface HeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  status?: string;
  tone?: EmailTone;
}

function getToneColors(tone: EmailTone) {
  switch (tone) {
    case 'success':
      return { color: '#d1fadf', border: 'rgba(209,250,223,.34)' };
    case 'warning':
      return { color: '#ffead5', border: 'rgba(255,234,213,.34)' };
    case 'danger':
      return { color: '#fee4e2', border: 'rgba(254,228,226,.36)' };
    case 'info':
      return { color: '#dbeafe', border: 'rgba(219,234,254,.36)' };
    default:
      return { color: '#d9edf3', border: 'rgba(217,237,243,.34)' };
  }
}

export default function Header({
  title,
  subtitle,
  eyebrow = 'CPEYE MONITOR',
  status,
  tone = 'neutral',
}: HeaderProps) {
  const toneColors = getToneColors(tone);

  return (
    <Section
      style={{
        backgroundColor: emailTheme.brandDark,
        backgroundImage: 'linear-gradient(135deg,#0e4358 0%,#176b87 58%,#2388a5 100%)',
        padding: '34px 34px 30px',
      }}
    >
      <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top' }}>
              <Text
                style={{
                  color: '#a8d8e5',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '1.7px',
                  margin: '0 0 13px',
                }}
              >
                {eyebrow}
              </Text>
              <Text
                style={{
                  color: '#ffffff',
                  fontSize: '29px',
                  fontWeight: 800,
                  lineHeight: '1.22',
                  letterSpacing: '-0.6px',
                  margin: 0,
                }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={{
                    color: '#c8e5ec',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    margin: '9px 0 0',
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </td>
            {status ? (
              <td style={{ width: '1%', paddingLeft: '16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                <span
                  style={{
                    display: 'inline-block',
                    border: `1px solid ${toneColors.border}`,
                    borderRadius: '999px',
                    color: toneColors.color,
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '.3px',
                    padding: '7px 11px',
                  }}
                >
                  {status}
                </span>
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
    </Section>
  );
}
