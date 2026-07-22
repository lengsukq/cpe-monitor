import { Text } from '@react-email/components';
import { emailTheme } from './Layout';

interface SectionHeadingProps {
  title: string;
  description?: string;
  trailing?: React.ReactNode;
}

export default function SectionHeading({
  title,
  description,
  trailing,
}: SectionHeadingProps) {
  return (
    <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
      <tbody>
        <tr>
          <td style={{ verticalAlign: 'bottom' }}>
            <Text
              style={{
                color: emailTheme.text,
                fontSize: '17px',
                fontWeight: 750,
                letterSpacing: '-0.25px',
                lineHeight: '1.3',
                margin: 0,
              }}
            >
              {title}
            </Text>
            {description ? (
              <Text
                style={{
                  color: emailTheme.muted,
                  fontSize: '12px',
                  lineHeight: '1.55',
                  margin: '5px 0 0',
                }}
              >
                {description}
              </Text>
            ) : null}
          </td>
          {trailing ? (
            <td style={{ width: '1%', paddingLeft: '14px', textAlign: 'right', verticalAlign: 'bottom', whiteSpace: 'nowrap' }}>
              {trailing}
            </td>
          ) : null}
        </tr>
      </tbody>
    </table>
  );
}
