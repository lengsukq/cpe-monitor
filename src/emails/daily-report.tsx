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

function SignalMeter({ value }: { value: number }) {
  const bars = Math.min(5, Math.max(0, Math.round((value + 120) / 25)));
  const colorOptions = ['#ef4444', '#ef4444', '#eab308', '#22c55e', '#22c55e'];

  const cells = Array.from({ length: 5 }, (_, i) => {
    const filled = i < bars;
    return `<td style="padding:0 2px 0 0">
      <div style="width:8px;height:${8 + i * 4}px;border-radius:2px 2px 0 0;background:${filled ? colorOptions[i] : '#e2e8f0'};transition:background 0.3s"></div>
    </td>`;
  }).join('');

  return `<table style="border-collapse:collapse;display:inline-block">${cells}</table>`;
}

export default function DailyReportEmail({ data }: DailyReportEmailProps) {
  const topDevices = Array.isArray(data.topDevices) ? data.topDevices : [];

  return (
    <Layout>
      <Header
        title="CPE 流量日报"
        subtitle={`${data.reportDate} · 网络运行概览`}
      />

      {/* 今日概览 - 三栏卡片 */}
      <Section style={{ padding: '28px 28px 8px 28px' }}>
        <Text
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1a2a36',
            margin: '0 0 16px 0',
            letterSpacing: '-0.2px',
          }}
        >
          今日概览
        </Text>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            <td style={{ width: '33.33%', paddingRight: '6px' }}>
              <StatCard title="总下载" value={formatBytes(data.totalDownload)} icon="⬇️" accentColor="#2c7a9e" />
            </td>
            <td style={{ width: '33.33%', padding: '0 6px' }}>
              <StatCard title="总上传" value={formatBytes(data.totalUpload)} icon="⬆️" accentColor="#3b8db0" />
            </td>
            <td style={{ width: '33.33%', paddingLeft: '6px' }}>
              <StatCard title="在线设备" value={`${topDevices.length} 台`} icon="📱" accentColor="#5bb8d9" />
            </td>
          </tr>
        </table>
      </Section>

      {/* 流量峰值时段 */}
      <Section style={{ padding: '12px 28px 4px 28px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'linear-gradient(135deg, #f0f7fb 0%, #e8f0f5 100%)',
            borderRadius: '10px',
            border: '1px solid #dce8f0',
          }}
        >
          <tr>
            <td style={{ padding: '14px 18px' }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <tr>
                  <td style={{ verticalAlign: 'middle', paddingRight: '12px', fontSize: '20px', lineHeight: '1' }}>
                    ⏰
                  </td>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '12px', color: '#6b7a88', fontWeight: 500 }}>
                      流量峰值时段
                    </span>
                    <br />
                    <span style={{ fontSize: '16px', color: '#1a2a36', fontWeight: 700 }}>
                      {data.peakHour !== null ? `${String(data.peakHour).padStart(2, '0')}:00 – ${String(data.peakHour + 1).padStart(2, '0')}:00` : '暂无数据'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Section>

      {/* 设备排名 */}
      <Section style={{ padding: '16px 28px' }}>
        <Text
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1a2a36',
            margin: '0 0 14px 0',
            letterSpacing: '-0.2px',
          }}
        >
          设备使用排名
        </Text>
        {topDevices.length > 0 ? (
          <DeviceTable devices={topDevices} />
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', border: '1px dashed #dce8f0', borderRadius: '12px' }}>
            暂无设备数据
          </div>
        )}
      </Section>

      {/* 分隔线 */}
      <div style={{ height: '1px', background: '#e8f0f5', margin: '0 28px' }} />

      {/* 网络质量评估 */}
      <Section style={{ padding: '20px 28px' }}>
        <Text
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1a2a36',
            margin: '0 0 16px 0',
            letterSpacing: '-0.2px',
          }}
        >
          网络质量评估
        </Text>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tr>
            {/* Quality badge column */}
            <td style={{ verticalAlign: 'top', width: '50%', paddingRight: '10px' }}>
              <QualityBadge quality={data.networkQuality || '未知'} />
            </td>
            {/* Signal meter column */}
            <td style={{ verticalAlign: 'top', width: '50%', paddingLeft: '10px', textAlign: 'right' }}>
              {data.avgSignal !== null && (
                <div style={{ display: 'inline-block' }}>
                  <div dangerouslySetInnerHTML={{ __html: SignalMeter({ value: data.avgSignal }) }} />
                </div>
              )}
            </td>
          </tr>
        </table>

        {/* Detail metrics */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
          <tr>
            <td style={{ padding: '10px 14px', background: '#f7fafc', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tr>
                  <td style={{ padding: '4px 0', color: '#6b7a88', fontSize: '13px' }}>平均信号强度</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', color: '#1a2a36', fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {data.avgSignal || 0} dBm
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 0', color: '#6b7a88', fontSize: '13px', borderTop: '1px solid #e8f0f5' }}>数据完整率</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', color: '#1a2a36', fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', borderTop: '1px solid #e8f0f5' }}>
                    {data.uptimePercent?.toFixed(1) || 0}%
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        {/* 完整率说明 */}
        <div style={{ marginTop: '8px', fontSize: '10px', color: '#aab8c4', lineHeight: '1.5', textAlign: 'center' }}>
          数据完整率 = 实际采集次数 ÷ 预期采集次数（基于调度间隔计算）。
          {data.uptimePercent !== null && data.uptimePercent < 70 && (
            <> 若刚开启调度器，完整率偏低属正常现象。</>
          )}
        </div>
      </Section>

      <Footer />
    </Layout>
  );
}
