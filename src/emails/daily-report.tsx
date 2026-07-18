import { Section, Text } from '@react-email/components';
import Layout from './components/Layout';
import Header from './components/Header';
import StatCard from './components/StatCard';
import DeviceTable from './components/DeviceTable';
import QualityBadge from './components/QualityBadge';
import Footer from './components/Footer';
import type { DailyReport } from '@/types';
import { formatBytes } from '@/lib/format';

interface DailyReportEmailProps {
  data: DailyReport;
}

export default function DailyReportEmail({ data }: DailyReportEmailProps) {
  const topDevices = Array.isArray(data.topDevices) ? data.topDevices : [];

  return (
    <Layout>
      <Header
        title="CPE 流量日报"
        subtitle={data.reportDate}
      />

      {/* 今日概览 */}
      <Section className="p-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">今日概览</Text>
        <table className="w-full">
          <tr>
            <td className="w-1/3 pr-2">
              <StatCard title="总下载" value={formatBytes(data.totalDownload)} icon="⬇️" />
            </td>
            <td className="w-1/3 px-2">
              <StatCard title="总上传" value={formatBytes(data.totalUpload)} icon="⬆️" />
            </td>
            <td className="w-1/3 pl-2">
              <StatCard title="在线设备" value={`${topDevices.length} 台`} icon="📱" />
            </td>
          </tr>
        </table>
      </Section>

      {/* 流量峰值 */}
      <Section className="px-6 pb-4">
        <Text className="text-sm text-gray-500">
          流量峰值时段: {data.peakHour !== null ? `${data.peakHour}:00 - ${data.peakHour + 1}:00` : '无数据'}
        </Text>
      </Section>

      {/* 设备排名 */}
      <Section className="p-6 bg-gray-50">
        <Text className="text-lg font-bold text-gray-900 mb-4">设备使用排名</Text>
        {topDevices.length > 0 ? (
          <DeviceTable devices={topDevices} />
        ) : (
          <Text className="text-gray-500 text-sm">暂无设备数据</Text>
        )}
      </Section>

      {/* 网络质量 */}
      <Section className="p-6">
        <Text className="text-lg font-bold text-gray-900 mb-4">网络质量评估</Text>
        <QualityBadge quality={data.networkQuality || '未知'} />
        <table className="w-full mt-4">
          <tr>
            <td className="text-gray-500 text-sm">平均信号强度</td>
            <td className="text-gray-900 text-sm text-right">{data.avgSignal || 0} dBm</td>
          </tr>
          <tr>
            <td className="text-gray-500 text-sm">网络可用性</td>
            <td className="text-gray-900 text-sm text-right">{data.uptimePercent?.toFixed(1) || 0}%</td>
          </tr>
        </table>
      </Section>

      <Footer />
    </Layout>
  );
}
