import { Section, Text } from '@react-email/components';

interface StatCardProps {
  title: string;
  value: string;
  icon?: string;
}

export default function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Section className="bg-gray-50 rounded-lg p-4 text-center">
      {icon && <Text className="text-2xl mb-1">{icon}</Text>}
      <Text className="text-gray-500 text-sm mb-1">{title}</Text>
      <Text className="text-gray-900 text-xl font-bold m-0">{value}</Text>
    </Section>
  );
}
