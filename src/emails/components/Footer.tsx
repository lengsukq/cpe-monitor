import { Section, Text } from '@react-email/components';

export default function Footer() {
  return (
    <Section className="bg-gray-800 p-4">
      <Text className="text-gray-400 text-xs text-center m-0">
        CPE Monitor - 自动生成报告
      </Text>
      <Text className="text-gray-500 text-xs text-center mt-1 mb-0">
        此邮件由系统自动发送，请勿回复
      </Text>
    </Section>
  );
}
