import { Section, Text } from '@react-email/components';

export default function Footer() {
  return (
    <Section
      style={{
        background: '#1a2a36',
        padding: '24px 36px',
        textAlign: 'center',
      }}
    >
      <Text
        style={{
          color: '#6b8a9e',
          fontSize: '11px',
          margin: '0 0 4px 0',
          fontWeight: 500,
        }}
      >
        CPEye Monitor &middot; 自动生成报告
      </Text>
      <Text
        style={{
          color: '#4a6a7e',
          fontSize: '10px',
          margin: '0',
        }}
      >
        此邮件由系统自动发送，请勿回复
      </Text>
      {/* Decorative line */}
      <div
        style={{
          width: '32px',
          height: '2px',
          background: '#2c5a78',
          borderRadius: '1px',
          margin: '12px auto 0 auto',
        }}
      />
    </Section>
  );
}
