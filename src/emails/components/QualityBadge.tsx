import { Section, Text } from '@react-email/components';

interface QualityBadgeProps {
  quality: string;
}

export default function QualityBadge({ quality }: QualityBadgeProps) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    '优秀': { bg: 'bg-green-100', text: 'text-green-800' },
    '良好': { bg: 'bg-blue-100', text: 'text-blue-800' },
    '一般': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    '差': { bg: 'bg-red-100', text: 'text-red-800' },
  };

  const colors = colorMap[quality] || colorMap['一般'];

  return (
    <Section className={`inline-block ${colors.bg} rounded-full px-4 py-2`}>
      <Text className={`${colors.text} text-sm font-bold m-0`}>
        网络质量: {quality}
      </Text>
    </Section>
  );
}
