import { Section, Text } from '@react-email/components';
import Layout from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';

interface AlertNotificationEmailProps {
  data: {
    ruleName: string;
    message: string;
    timestamp: string;
  };
}

export default function AlertNotificationEmail({ data }: AlertNotificationEmailProps) {
  return (
    <Layout>
      <Header
        title="CPE 告警通知"
        subtitle={data.timestamp}
      />

      <Section className="p-6">
        <Section className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <Text className="text-red-800 font-bold text-lg mb-2">
            {data.ruleName}
          </Text>
          <Text className="text-red-700 text-sm">
            {data.message}
          </Text>
        </Section>

        <Section className="mt-6">
          <Text className="text-gray-500 text-sm">
            请及时检查设备状态，确认网络连接是否正常。
          </Text>
        </Section>
      </Section>

      <Footer />
    </Layout>
  );
}
