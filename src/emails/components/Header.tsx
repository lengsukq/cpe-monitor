import { Section, Text } from '@react-email/components';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <Section
      style={{
        background: 'linear-gradient(135deg, #1a5a78 0%, #2c7a9e 50%, #3b8db0 100%)',
        padding: '40px 36px',
        borderRadius: '0',
      }}
    >
      <Text
        style={{
          color: '#ffffff',
          fontSize: '26px',
          fontWeight: 800,
          margin: '0 0 6px 0',
          letterSpacing: '-0.3px',
          lineHeight: '1.2',
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            color: '#a3d4e8',
            fontSize: '14px',
            margin: '0',
            fontWeight: 400,
          }}
        >
          {subtitle}
        </Text>
      )}
      {/* Decorative accent line */}
      <div
        style={{
          width: '48px',
          height: '3px',
          background: '#5bb8d9',
          borderRadius: '2px',
          margin: '12px 0 0 0',
        }}
      />
    </Section>
  );
}
