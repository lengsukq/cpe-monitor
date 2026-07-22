import { Section, Text } from '@react-email/components';
import Layout, { emailTheme } from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';
import StatCard from './components/StatCard';
import SectionHeading from './components/SectionHeading';
import StatusBadge from './components/StatusBadge';
import InfoTable from './components/InfoTable';
import DeviceTable, { type DeviceTableItem } from './components/DeviceTable';
import { formatBytes } from '@/lib/format';

export interface CollectionReportEmailData {
  success: boolean;
  collectionId: number | null;
  source: string;
  error: string | null;
  collectedDevices: number;
  alertsTriggered: number;
  trafficDelta: { uploadBytes: number; downloadBytes: number } | null;
  cumulativeTraffic: { uploadBytes: number; downloadBytes: number } | null;
  rates: { uploadBps: number; downloadBps: number } | null;
  network: {
    networkType: string | null;
    band: string | null;
    cellId: string | null;
    pci: string | null;
  } | null;
  signal: {
    signalStrength: number | null;
    rsrp: number | null;
    rsrq: number | null;
    sinr: number | null;
    rssi: number | null;
  } | null;
  topDevices: DeviceTableItem[];
  collectedAt: string;
  completedAt: string;
  durationMs: number;
}

interface CollectionReportEmailProps {
  data: CollectionReportEmailData;
}

function formatDateTime(value: string): string {
  if (!value) return '—';
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
}

function formatBitsPerSecond(value: number | null | undefined): string {
  const bps = Math.max(0, value || 0);
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${Math.round(bps)} bps`;
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} 秒`;
  return `${Math.floor(milliseconds / 60_000)} 分 ${Math.round((milliseconds % 60_000) / 1000)} 秒`;
}

function formatMetric(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
}

function getSignalQuality(rsrp: number | null | undefined): string {
  if (rsrp === null || rsrp === undefined) return '暂无评级';
  if (rsrp >= -80) return '优秀';
  if (rsrp >= -95) return '良好';
  if (rsrp >= -105) return '一般';
  return '较差';
}

export default function CollectionReportEmail({ data }: CollectionReportEmailProps) {
  const totalDelta = data.trafficDelta
    ? data.trafficDelta.uploadBytes + data.trafficDelta.downloadBytes
    : 0;
  const hasDeviceTraffic = data.topDevices.some((device) => (
    device.uploadBytes + device.downloadBytes > 0
  ));
  const generatedAt = formatDateTime(data.completedAt || data.collectedAt);

  return (
    <Layout
      preview={data.success
        ? `采集成功：${data.collectedDevices} 台设备，新增流量 ${formatBytes(totalDelta)}`
        : `采集失败：${data.error || '无法获取 CPE 数据'}`}
    >
      <Header
        title="CPE 采集报告"
        subtitle={`${formatDateTime(data.collectedAt)} · ${data.source === 'manual' ? '手动采集' : '定时采集'}`}
        status={data.success ? '采集成功' : '采集失败'}
        tone={data.success ? 'success' : 'danger'}
      />

      <Section style={{ padding: '26px 30px 0' }}>
        <table
          role="presentation"
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            backgroundColor: data.success ? emailTheme.successSoft : emailTheme.dangerSoft,
            border: `1px solid ${data.success ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: '12px',
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '15px 17px' }}>
                <Text
                  style={{
                    color: data.success ? emailTheme.success : emailTheme.danger,
                    fontSize: '14px',
                    fontWeight: 800,
                    lineHeight: '1.4',
                    margin: 0,
                  }}
                >
                  {data.success ? '本次采集已完成' : '本次采集未能完成'}
                </Text>
                <Text
                  style={{
                    color: data.success ? '#3f6e4e' : '#8f3f38',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    margin: '5px 0 0',
                  }}
                >
                  {data.success
                    ? `已写入采集批次 #${data.collectionId ?? '—'}，共识别 ${data.collectedDevices} 台在线设备。`
                    : data.error || '请检查 CPE 地址、网络连接、登录会话和设备状态。'}
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      {data.success ? (
        <>
          <Section style={{ padding: '24px 30px 0' }}>
            <SectionHeading title="采集概览" description="区间流量和平均速率均基于相邻采集点计算。" />
            <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', padding: '0 6px 6px 0' }}>
                    <StatCard title="在线设备" value={`${data.collectedDevices} 台`} icon="▦" detail="本次采集时刻的在线终端" />
                  </td>
                  <td style={{ width: '50%', padding: '0 0 6px 6px' }}>
                    <StatCard title="区间总流量" value={formatBytes(totalDelta)} icon="↕" detail={`下载 ${formatBytes(data.trafficDelta?.downloadBytes || 0)} · 上传 ${formatBytes(data.trafficDelta?.uploadBytes || 0)}`} />
                  </td>
                </tr>
                <tr>
                  <td style={{ width: '50%', padding: '6px 6px 0 0' }}>
                    <StatCard title="平均下载速率" value={formatBitsPerSecond(data.rates?.downloadBps)} icon="↓" detail="采集区间平均值" />
                  </td>
                  <td style={{ width: '50%', padding: '6px 0 0 6px' }}>
                    <StatCard title="平均上传速率" value={formatBitsPerSecond(data.rates?.uploadBps)} icon="↑" detail="采集区间平均值" />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{ padding: '24px 30px 0' }}>
            <SectionHeading
              title="蜂窝网络快照"
              description="网络制式、小区与射频指标来自本次采集。"
              trailing={<StatusBadge tone={getSignalQuality(data.signal?.rsrp) === '较差' ? 'danger' : 'info'}>{getSignalQuality(data.signal?.rsrp)}</StatusBadge>}
            />
            <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', paddingRight: '6px', verticalAlign: 'top' }}>
                    <InfoTable rows={[
                      { label: '网络制式', value: data.network?.networkType || '—', emphasis: true },
                      { label: '频段', value: data.network?.band || '—' },
                      { label: 'Cell ID', value: data.network?.cellId || '—', mono: true },
                      { label: 'PCI', value: data.network?.pci || '—', mono: true },
                    ]} />
                  </td>
                  <td style={{ width: '50%', paddingLeft: '6px', verticalAlign: 'top' }}>
                    <InfoTable rows={[
                      { label: 'RSRP', value: formatMetric(data.signal?.rsrp, 'dBm'), emphasis: true },
                      { label: 'RSRQ', value: formatMetric(data.signal?.rsrq, 'dB') },
                      { label: 'SINR', value: formatMetric(data.signal?.sinr, 'dB') },
                      { label: 'RSSI', value: formatMetric(data.signal?.rssi, 'dBm') },
                    ]} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={{ padding: '24px 30px 0' }}>
            <SectionHeading
              title="在线设备流量排行"
              description="显示本次采集区间内产生流量的设备，最多展示 10 台。"
              trailing={<StatusBadge>{data.topDevices.length} 台</StatusBadge>}
            />
            {hasDeviceTraffic ? (
              <DeviceTable devices={data.topDevices} showConnection />
            ) : (
              <Text style={{ ...emptyStateStyle }}>
                CPE 未返回有效的单设备区间流量，本次无法生成设备排行。
              </Text>
            )}
          </Section>

          <Section style={{ padding: '24px 30px 0' }}>
            <SectionHeading title="累计计数器" description="用于核对 CPE 自身累计流量，不代表本次区间使用量。" />
            <InfoTable rows={[
              { label: '累计下载', value: formatBytes(data.cumulativeTraffic?.downloadBytes || 0) },
              { label: '累计上传', value: formatBytes(data.cumulativeTraffic?.uploadBytes || 0) },
              { label: '兼容信号字段', value: formatMetric(data.signal?.signalStrength, 'dBm') },
            ]} />
          </Section>
        </>
      ) : null}

      <Section style={{ padding: '24px 30px 30px' }}>
        <SectionHeading
          title="执行信息"
          trailing={data.alertsTriggered > 0
            ? <StatusBadge tone="warning">{data.alertsTriggered} 条告警</StatusBadge>
            : <StatusBadge tone="success">无告警</StatusBadge>}
        />
        <InfoTable rows={[
          { label: '采集批次', value: data.collectionId === null ? '未创建' : `#${data.collectionId}`, mono: true },
          { label: '采集来源', value: data.source === 'manual' ? '手动采集' : data.source },
          { label: '开始时间', value: formatDateTime(data.collectedAt) },
          { label: '完成时间', value: formatDateTime(data.completedAt) },
          { label: '执行耗时', value: formatDuration(data.durationMs), emphasis: true },
          { label: '触发告警', value: `${data.alertsTriggered} 条` },
        ]} />
        <Text
          style={{
            color: emailTheme.subtle,
            fontSize: '10px',
            lineHeight: '1.55',
            margin: '12px 2px 0',
            textAlign: 'center',
          }}
        >
          {data.alertsTriggered > 0
            ? '告警通知会按照规则中的邮件与企业微信设置分别发送。'
            : '本次采集未发现达到阈值的已启用告警规则。'}
        </Text>
      </Section>

      <Footer generatedAt={generatedAt} />
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
