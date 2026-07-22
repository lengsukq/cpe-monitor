import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
} from '@react-email/components';

interface LayoutProps {
  children: React.ReactNode;
  preview?: string;
}

export const emailTheme = {
  page: '#eef3f7',
  surface: '#ffffff',
  surfaceMuted: '#f7fafc',
  border: '#dce6ee',
  borderSoft: '#e8eff4',
  text: '#142633',
  muted: '#647987',
  subtle: '#8ea0ad',
  brand: '#176b87',
  brandDark: '#0e4358',
  brandSoft: '#e9f5f8',
  success: '#15803d',
  successSoft: '#ecfdf3',
  warning: '#b45309',
  warningSoft: '#fff7ed',
  danger: '#b42318',
  dangerSoft: '#fff1f0',
  info: '#2563eb',
  infoSoft: '#eff6ff',
} as const;

export default function Layout({ children, preview }: LayoutProps) {
  return (
    <Html lang="zh-CN">
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Body
        style={{
          margin: 0,
          padding: '24px 12px',
          backgroundColor: emailTheme.page,
          color: emailTheme.text,
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",Arial,sans-serif',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <Container
          style={{
            width: '100%',
            maxWidth: '680px',
            margin: '0 auto',
          }}
        >
          <Section
            style={{
              overflow: 'hidden',
              backgroundColor: emailTheme.surface,
              border: `1px solid ${emailTheme.border}`,
              borderRadius: '18px',
              boxShadow: '0 12px 32px rgba(23, 50, 66, 0.08)',
            }}
          >
            {children}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
