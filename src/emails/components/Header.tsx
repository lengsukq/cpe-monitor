import { Section, Text } from '@react-email/components';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <Section className="bg-gradient-to-r from-blue-600 to-purple-600 p-8">
      <Text className="text-white text-2xl font-bold m-0">
        {title}
      </Text>
      {subtitle && (
        <Text className="text-blue-100 text-sm mt-2 mb-0">
          {subtitle}
        </Text>
      )}
    </Section>
  );
}
