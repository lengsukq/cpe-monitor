import { Section, Text } from '@react-email/components';

interface StatCardProps {
  title: string;
  value: string;
  icon?: string;
  accentColor?: string;
}

export default function StatCard({ title, value, icon, accentColor = '#2c7a9e' }: StatCardProps) {
  return (
    <Section
      style={{
        background: '#f7fafc',
        borderRadius: '12px',
        padding: '20px 12px',
        textAlign: 'center',
        border: '1px solid #e8f0f5',
      }}
    >
      {icon && (
        <Text
          style={{
            fontSize: '24px',
            margin: '0 0 8px 0',
            lineHeight: '1',
          }}
        >
          {icon}
        </Text>
      )}
      <Text
        style={{
          color: '#6b7a88',
          fontSize: '12px',
          margin: '0 0 4px 0',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: accentColor,
          fontSize: '22px',
          fontWeight: 800,
          margin: '0',
          lineHeight: '1.2',
          letterSpacing: '-0.3px',
        }}
      >
        {value}
      </Text>
    </Section>
  );
}
