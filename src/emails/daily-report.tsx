import { Section, Text } from '@react-email/components';
import Layout, { emailTheme } from './components/Layout';
import Header from './components/Header';
import StatCard from './components/StatCard';
import DeviceTable from './components/DeviceTable';
import QualityBadge from './components/QualityBadge';
import Footer from './components/Footer';
import SectionHeading from './components/SectionHeading';
import StatusBadge from './components/StatusBadge';
import InfoTable from './components/InfoTable';
import type { DailyReport } from '@/types';
import { formatBytes } from '@/lib/format';

interface DailyReportEmailProps {
  data: DailyReport;
}

function formatBitsPerSecond(value: number | null | undefined): string {
  const bps = Math.max(0, value || 0);
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${Math.round(bps)} bps`;
}

function formatMetric(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)} ${unit}`;
}

function formatGeneratedAt(value: string | undefined): string {
  if (!value) return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
}

function getQualityTone(quality: string | null) {
  if (quality === '优秀' || quality === '良好') return 'success' as const;
  if (quality === '差') return 'danger' as const;
  if (quality === '一般') return 'warning' as const;
  return 'neutral' as const;
}

export default function DailyReportEmail({ data }: DailyReportEmailProps) {
  const topDevices = Array.isArray(data.topDevices) ? data.topDevices : [];
  const totalTraffic = (data.totalDownload || 0) + (data.totalUpload || 0);
  const peakWindow = data.peakHour === null
    ? '暂无数据'
    : `${String(data.peakHour).padStart(2, '0')}:00 – ${String((data.peakHour + 1) % 24).padStart(2, '0')}:00`;
  const generatedAt = formatGeneratedAt(data.generatedAt);
  const summaryTone = (data.failedCollections || 0) > 0 || (data.alertCount || 0) > 0
    ? 'warning'
    : getQualityTone(data.networkQuality);
  const summaryColors = summaryTone === 'danger'
    ? {
        background: emailTheme.dangerSoft,
        border: '#fecaca',
        title: emailTheme.danger,
        body: '#8f3f38',
      }
    : summaryTone === 'warning'
      ? {
          background: emailTheme.warningSoft,
          border: '#fed7aa',
          title: emailTheme.warning,
          body: '#8b5a2b',
        }
      : summaryTone === 'neutral'
        ? {
            background: emailTheme.surfaceMuted,
            border: emailTheme.border,
            title: emailTheme.muted,
            body: emailTheme.subtle,
          }
        : {
            background: emailTheme.successSoft,
            border: '#bbf7d0',
            title: emailTheme.success,
            body: '#3f6e4e',
          };

  return (
    <Layout preview={`${data.reportDate}：总流量 ${formatBytes(totalTraffic)}，网络质量 ${data.networkQuality || '数据不足'}`}>
      <Header
        title="CPE 网络运行日报"
        subtitle={`${data.reportDate} · 流量、采集、设备与射频质量汇总`}
        status={data.networkQuality || '数据不足'}
        tone={getQualityTone(data.networkQuality)}
      />

      <Section style={{ padding: '26px 30px 0' }}>
        <table
          role="presentation"
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            backgroundColor: summaryColors.background,
            border: `1px solid ${summaryColors.border}`,
            borderRadius: '12px',
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '15px 17px' }}>
                <Text style={{ color: summaryColors.title, fontSize: '14px', fontWeight: 800, margin: 0 }}>
                  {(data.failedCollections || 0) > 0
                    ? `今日有 ${data.failedCollections} 次采集失败`
                    : (data.alertCount || 0) > 0
                      ? `今日触发 ${data.alertCount} 条告警`
                      : '今日采集运行正常'}
                </Text>
                <Text style={{ color: summaryColors.body, fontSize: '11px', lineHeight: '1.6', margin: '5px 0 0' }}>
                  实际采集 {data.sampleCount || 0} 个样本，数据完整率 {data.uptimePercent?.toFixed(1) || '0.0'}%，共记录 {topDevices.length} 台活跃设备。
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ padding: '24px 30px 0' }}>
        <SectionHeading title="今日流量概览" description="每日流量按采集区间增量累计，可正确处理 CPE 计数器清零。" />
        <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', padding: '0 6px 6px 0' }}>
                <StatCard title="总下载" value={formatBytes(data.totalDownload)} icon="↓" detail={`峰值速率 ${formatBitsPerSecond(data.peakDownloadBps)}`} />
              </td>
              <td style={{ width: '50%', padding: '0 0 6px 6px' }}>
                <StatCard title="总上传" value={formatBytes(data.totalUpload)} icon="↑" detail={`峰值速率 ${formatBitsPerSecond(data.peakUploadBps)}`} />
              </td>
            </tr>
            <tr>
              <td style={{ width: '50%', padding: '6px 6px 0 0' }}>
                <StatCard title="总流量" value={formatBytes(totalTraffic)} icon="↕" detail={`峰值小时流量 ${formatBytes(data.peakTrafficBytes || 0)}`} />
              </td>
              <td style={{ width: '50%', padding: '6px 0 0 6px' }}>
                <StatCard title="设备规模" value={`${data.maxDevices || 0} 台`} icon="▦" detail={`平均在线 ${(data.averageDevices || 0).toFixed(1)} 台`} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ padding: '24px 30px 0' }}>
        <SectionHeading
          title="采集与告警运行"
          description="完整率反映实际采集样本与按调度间隔计算的预期样本比例。"
          trailing={<StatusBadge tone={summaryTone}>{data.uptimePercent?.toFixed(1) || '0.0'}%</StatusBadge>}
        />
        <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
                <InfoTable rows={[
                  { label: '实际样本', value: `${data.sampleCount || 0} 个`, emphasis: true },
                  { label: '预期样本', value: `${data.expectedSamples || 0} 个` },
                  { label: '成功采集', value: `${data.successfulCollections || 0} 次` },
                  { label: '失败采集', value: `${data.failedCollections || 0} 次` },
                ]} />
              </td>
              <td style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                <InfoTable rows={[
                  { label: '数据完整率', value: `${data.uptimePercent?.toFixed(1) || '0.0'}%`, emphasis: true },
                  { label: '告警次数', value: `${data.alertCount || 0} 条` },
                  { label: '峰值时段', value: peakWindow },
                  { label: '峰值小时流量', value: formatBytes(data.peakTrafficBytes || 0) },
                ]} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ padding: '24px 30px 0' }}>
        <SectionHeading
          title="网络与射频质量"
          description="射频均值基于当日有效采样计算，缺失指标不会按 0 参与平均。"
          trailing={<QualityBadge quality={data.networkQuality || '数据不足'} />}
        />
        <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
                <InfoTable rows={[
                  { label: '平均 RSRP', value: formatMetric(data.avgRsrp, 'dBm'), emphasis: true },
                  { label: '平均 RSRQ', value: formatMetric(data.avgRsrq, 'dB') },
                  { label: '平均 SINR', value: formatMetric(data.avgSinr, 'dB') },
                  { label: '平均 RSSI', value: formatMetric(data.avgRssi, 'dBm') },
                ]} />
              </td>
              <td style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                <InfoTable rows={[
                  { label: '兼容信号均值', value: data.avgSignal === null ? '—' : `${data.avgSignal} dBm` },
                  { label: '网络制式', value: data.networkTypes?.length ? data.networkTypes.join(' / ') : '—', emphasis: true },
                  { label: '使用频段', value: data.bands?.length ? data.bands.join(' / ') : '—' },
                  { label: '质量评级', value: data.networkQuality || '数据不足' },
                ]} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ padding: '24px 30px 0' }}>
        <SectionHeading
          title="设备流量排名"
          description="按当日区间流量累计排序，最多展示 10 台设备。"
          trailing={<StatusBadge>{topDevices.length} 台</StatusBadge>}
        />
        {topDevices.length > 0 ? (
          <DeviceTable devices={topDevices} />
        ) : (
          <Text style={emptyStateStyle}>今日暂无可用于排名的设备流量数据。</Text>
        )}
      </Section>

      <Section style={{ padding: '22px 30px 30px' }}>
        <Text style={{ color: emailTheme.subtle, fontSize: '10px', lineHeight: '1.6', margin: 0, textAlign: 'center' }}>
          网络质量评级综合参考 RSRP 或兼容信号均值及数据完整率。日报中的完整率不是运营商网络可用率。
        </Text>
      </Section>

      <Footer generatedAt={generatedAt} note="日报由当日 SQLite 采集历史聚合生成，数据以 CPE 实际返回和成功写入的采样为准。" />
    </Layout>
  );
}

const emptyStateStyle: React.CSSProperties = {
  padding: '20px',
  margin: 0,
  backgroundColor: emailTheme.surfaceMuted,
  border: `1px dashed ${emailTheme.border}`,
  borderRadius: '12px',
  color: emailTheme.muted,
  fontSize: '12px',
  lineHeight: '1.6',
  textAlign: 'center',
};
