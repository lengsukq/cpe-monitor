import { Section, Text } from '@react-email/components';
import { emailTheme } from './Layout';

interface StatCardProps {
  title: string;
  value: string;
  icon?: string;
  accentColor?: string;
  detail?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  accentColor = emailTheme.brand,
  detail,
}: StatCardProps) {
  return (
    <Section
      style={{
        minHeight: '112px',
        backgroundColor: emailTheme.surfaceMuted,
        border: `1px solid ${emailTheme.borderSoft}`,
        borderRadius: '12px',
        padding: '15px 14px',
      }}
    >
      <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top' }}>
              <Text
                style={{
                  color: emailTheme.muted,
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '.45px',
                  lineHeight: '1.3',
                  margin: 0,
                  textTransform: 'uppercase',
                }}
              >
                {title}
              </Text>
            </td>
            {icon ? (
              <td style={{ width: '1%', paddingLeft: '8px', textAlign: 'right', verticalAlign: 'top' }}>
                <span style={{ fontSize: '18px', lineHeight: '1' }}>{icon}</span>
              </td>
            ) : null}
          </tr>
        </tbody>
      </table>
      <Text
        style={{
          color: accentColor,
          fontSize: '23px',
          fontWeight: 800,
          letterSpacing: '-0.45px',
          lineHeight: '1.2',
          margin: '10px 0 0',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Text>
      {detail ? (
        <Text
          style={{
            color: emailTheme.subtle,
            fontSize: '10px',
            lineHeight: '1.45',
            margin: '7px 0 0',
          }}
        >
          {detail}
        </Text>
      ) : null}
    </Section>
  );
}
