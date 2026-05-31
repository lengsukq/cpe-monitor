import { Html, Head, Body, Container } from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-8 max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
