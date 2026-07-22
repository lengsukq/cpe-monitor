import { Section, Text } from '@react-email/components';

interface FooterProps {
  generatedAt?: string;
  note?: string;
}

export default function Footer({ generatedAt, note }: FooterProps) {
  return (
    <Section
      style={{
        backgroundColor: '#0f2f3e',
        padding: '22px 34px 25px',
        textAlign: 'center',
      }}
    >
      <Text
        style={{
          color: '#a6c7d1',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '.7px',
          margin: 0,
        }}
      >
        CPEYE MONITOR · NETWORK OBSERVABILITY
      </Text>
      {generatedAt ? (
        <Text
          style={{
            color: '#6f98a6',
            fontSize: '10px',
            lineHeight: '1.5',
            margin: '7px 0 0',
          }}
        >
          生成时间：{generatedAt}
        </Text>
      ) : null}
      <Text
        style={{
          color: '#5f8795',
          fontSize: '10px',
          lineHeight: '1.55',
          margin: '5px 0 0',
        }}
      >
        {note || '此邮件由 CPE Monitor 自动生成。数据以采集时设备返回内容为准，请勿直接回复。'}
      </Text>
    </Section>
  );
}
