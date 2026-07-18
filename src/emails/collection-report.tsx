import { Section, Text } from '@react-email/components';
import Layout from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';
import { formatBytes } from '@/lib/format';

interface DeviceInfo {
  name: string;
  uploadBytes: number;
  downloadBytes: number;
}

interface CollectionReportEmailProps {
  collectedDevices: number;
  alertsTriggered: number;
  trafficDelta: {
    uploadBytes: number;
    downloadBytes: number;
  } | null;
  signalStrength: number | null;
  topDevices: DeviceInfo[];
  collectedAt: string;
}

function SignalMeterRow({ value }: { value: number }) {
  const bars = Math.min(5, Math.max(0, Math.round((value + 120) / 25)));
  const barsHtml = Array.from({ length: 5 }, (_, index) => {
    const filled = index < bars;
    const color = filled
      ? index < 2 ? '#ef4444' : index < 4 ? '#eab308' : '#22c55e'
      : '#e2e8f0';
    return `<td style="padding:0 1px"><div style="width:6px;height:${6 + index * 4}px;border-radius:2px 2px 0 0;background:${color}"></div></td>`;
  }).join('');

  return `<table style="border-collapse:collapse;display:inline-block">${barsHtml}</table>`;
}

export default function CollectionReportEmail({
  collectedDevices,
  alertsTriggered,
  trafficDelta,
  signalStrength,
  topDevices,
  collectedAt,
}: CollectionReportEmailProps) {
  const deltaTotal = trafficDelta
    ? trafficDelta.uploadBytes + trafficDelta.downloadBytes
    : 0;
  const devicesWithTraffic = topDevices.filter(
    (d) => d.uploadBytes + d.downloadBytes > 0,
  );
  const maxDeviceTraffic = devicesWithTraffic.length > 0
    ? Math.max(...devicesWithTraffic.map((d) => d.uploadBytes + d.downloadBytes))
    : 0;
  const collectedDate = collectedAt
    ? new Date(collectedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : '';

  const deviceRowsHtml = devicesWithTraffic
    .map((device, index) => {
      const totalBytes = device.uploadBytes + device.downloadBytes;
      const pct = maxDeviceTraffic > 0 ? Math.round((totalBytes / maxDeviceTraffic) * 100) : 0;
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
      return `
        <tr style="background:${bgColor}">
          <td style="padding:8px 12px;color:#64748b;font-size:13px">${index + 1}</td>
          <td style="padding:8px 12px;color:#172033;font-size:13px">${escapeHtml(device.name)}</td>
          <td style="padding:8px 12px">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:0;width:100%">
                  <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#6366f1);border-radius:3px"></div>
                  </div>
                </td>
                <td style="padding:0 0 0 8px;white-space:nowrap;color:#64748b;font-size:12px">${formatBytes(totalBytes)}</td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join('');

  return (
    <Layout>
      <Header
        title="CPE 采集报告"
        subtitle={collectedDate}
      />

      {/* 采集状态 */}
      <Section className="p-6 pb-2">
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tr>
            <td
              style={{
                display: 'inline-block',
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                background: '#dcfce7',
                color: '#16a34a',
              }}
            >
              采集成功
            </td>
          </tr>
        </table>
      </Section>

      {/* 概览卡片 */}
      <Section className="px-6">
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tr>
            {/* 在线设备 */}
            <td style={{ width: '33.33%', padding: '0 4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: '8px' }}>
                <tr>
                  <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>📱</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#172033', marginBottom: '2px' }}>
                      {collectedDevices}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>在线设备</div>
                  </td>
                </tr>
              </table>
            </td>

            {/* 新增流量 */}
            <td style={{ width: '33.33%', padding: '0 4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: '8px' }}>
                <tr>
                  <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>📊</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#172033', marginBottom: '2px' }}>
                      {formatBytes(deltaTotal)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>新增流量</div>
                    {trafficDelta && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        ↑ {formatBytes(trafficDelta.uploadBytes)}&nbsp;&nbsp;
                        ↓ {formatBytes(trafficDelta.downloadBytes)}
                      </div>
                    )}
                  </td>
                </tr>
              </table>
            </td>

            {/* 信号强度 */}
            <td style={{ width: '33.33%', padding: '0 4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: '8px' }}>
                <tr>
                  <td style={{ textAlign: 'center', padding: '16px 8px' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>📶</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#172033', marginBottom: '2px' }}>
                      {signalStrength ?? '--'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>信号</div>
                    {signalStrength !== null && (
                      <div style={{ marginTop: '4px' }}>
                        <SignalMeterRow value={signalStrength} />
                      </div>
                    )}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Section>

      {/* 设备排行 */}
      {topDevices.length > 0 && (
        <Section className="p-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            在线设备流量排行
          </Text>
          {devicesWithTraffic.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>#</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>设备名称</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>流量</th>
                </tr>
              </thead>
              <tbody dangerouslySetInnerHTML={{ __html: deviceRowsHtml }} />
            </table>
          ) : (
            <Text className="text-gray-500 text-sm" style={{ textAlign: 'center', padding: '12px 0' }}>
              CPE 未提供单设备流量数据，无法展示排行
            </Text>
          )}
        </Section>
      )}

      {/* 告警状态 */}
      <Section className="p-6 pt-0">
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <tr>
            <td style={{ padding: '16px' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tr>
                  <td style={{ verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#172033' }}>
                      {alertsTriggered > 0 ? '⚠️ 告警状态' : '✅ 告警状态'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    {alertsTriggered > 0 ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#fef2f2',
                        color: '#ef4444',
                      }}>
                        {alertsTriggered} 条触发
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#f8fafc',
                        color: '#94a3b8',
                        border: '1px solid #e2e8f0',
                      }}>
                        未触发告警
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ paddingTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.6 }}>
                      {alertsTriggered > 0
                        ? `有 ${alertsTriggered} 条告警规则被触发，已根据通知配置发送通知。`
                        : '所有已启用的告警规则均未达到触发条件，网络状态正常。'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Section>

      <Footer />
    </Layout>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character] || character));
}
