import { Section, Text } from '@react-email/components';
import Layout, { emailTheme } from './components/Layout';
import Header, { type EmailTone } from './components/Header';
import Footer from './components/Footer';
import StatCard from './components/StatCard';
import SectionHeading from './components/SectionHeading';
import InfoTable from './components/InfoTable';
import StatusBadge from './components/StatusBadge';

export interface AlertNotificationEmailData {
  ruleName: string;
  message: string;
  timestamp: string;
  metricType?: string;
  metricLabel?: string;
  currentValue?: number;
  unit?: string;
  operator?: string;
  threshold?: number;
  severity?: 'info' | 'warning' | 'critical';
  networkType?: string | null;
  band?: string | null;
  cellId?: string | null;
  pci?: string | null;
  collectionId?: number | null;
  guidance?: string[];
}

interface AlertNotificationEmailProps {
  data: AlertNotificationEmailData;
}

function getTone(severity: AlertNotificationEmailData['severity']): EmailTone {
  if (severity === 'critical') return 'danger';
  if (severity === 'info') return 'info';
  return 'warning';
}

function getSeverityLabel(severity: AlertNotificationEmailData['severity']): string {
  if (severity === 'critical') return '严重告警';
  if (severity === 'info') return '状态通知';
  return '需要关注';
}

function formatValue(value: number | undefined, unit = ''): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(2);
  return `${formatted}${unit ? ` ${unit}` : ''}`;
}

export default function AlertNotificationEmail({ data }: AlertNotificationEmailProps) {
  const tone = getTone(data.severity);
  const currentValue = formatValue(data.currentValue, data.unit);
  const condition = data.operator && data.threshold !== undefined
    ? `${data.operator} ${formatValue(data.threshold, data.unit)}`
    : '已达到规则条件';
  const guidance = data.guidance?.length
    ? data.guidance
    : ['检查 CPE 当前连接与射频状态。', '确认最近采集是否成功并对比历史趋势。'];

  return (
    <Layout preview={`${data.ruleName}：${data.metricLabel || '监控指标'} ${currentValue}`}>
      <Header
        title="CPE 告警通知"
        subtitle={`${data.timestamp} · 规则 ${data.ruleName}`}
        status={getSeverityLabel(data.severity)}
        tone={tone}
      />

      <Section style={{ padding: '26px 30px 0' }}>
        <Section
          style={{
            backgroundColor: tone === 'danger' ? emailTheme.dangerSoft : emailTheme.warningSoft,
            border: `1px solid ${tone === 'danger' ? '#fecaca' : '#fed7aa'}`,
            borderLeft: `4px solid ${tone === 'danger' ? emailTheme.danger : emailTheme.warning}`,
            borderRadius: '12px',
            padding: '17px 18px',
          }}
        >
          <Text
            style={{
              color: tone === 'danger' ? emailTheme.danger : emailTheme.warning,
              fontSize: '17px',
              fontWeight: 800,
              letterSpacing: '-0.2px',
              lineHeight: '1.35',
              margin: 0,
            }}
          >
            {data.ruleName}
          </Text>
          <Text
            style={{
              color: tone === 'danger' ? '#8f3f38' : '#8b5a2b',
              fontSize: '12px',
              lineHeight: '1.65',
              margin: '7px 0 0',
            }}
          >
            {data.message}
          </Text>
        </Section>
      </Section>

      <Section style={{ padding: '24px 30px 0' }}>
        <SectionHeading
          title="触发详情"
          description="当前值与规则条件来自触发本次告警的同一采集批次。"
          trailing={<StatusBadge tone={tone}>{getSeverityLabel(data.severity)}</StatusBadge>}
        />
        <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', paddingRight: '6px' }}>
                <StatCard
                  title={data.metricLabel || '当前值'}
                  value={currentValue}
                  icon="!"
                  accentColor={tone === 'danger' ? emailTheme.danger : emailTheme.warning}
                  detail={data.metricType ? `指标代码：${data.metricType}` : '触发时实际采集值'}
                />
              </td>
              <td style={{ width: '50%', paddingLeft: '6px' }}>
                <StatCard
                  title="规则条件"
                  value={condition}
                  icon="≷"
                  detail="达到条件后进入规则静默期"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section style={{ padding: '24px 30px 0' }}>
        <SectionHeading title="网络上下文" description="用于快速定位告警发生时所处的网络和小区。" />
        <InfoTable rows={[
          { label: '网络制式', value: data.networkType || '—', emphasis: true },
          { label: '频段', value: data.band || '—' },
          { label: 'Cell ID', value: data.cellId || '—', mono: true },
          { label: 'PCI', value: data.pci || '—', mono: true },
          { label: '采集批次', value: data.collectionId === null || data.collectionId === undefined ? '—' : `#${data.collectionId}`, mono: true },
          { label: '触发时间', value: data.timestamp },
        ]} />
      </Section>

      <Section style={{ padding: '24px 30px 0' }}>
        <SectionHeading title="建议检查" description="可按顺序排查，避免只根据单次采样判断故障。" />
        <Section
          style={{
            backgroundColor: emailTheme.surfaceMuted,
            border: `1px solid ${emailTheme.borderSoft}`,
            borderRadius: '12px',
            padding: '13px 16px',
          }}
        >
          {guidance.map((item, index) => (
            <table key={`${item}-${index}`} role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ width: '24px', padding: '5px 8px 5px 0', verticalAlign: 'top' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '19px',
                        height: '19px',
                        backgroundColor: emailTheme.brandSoft,
                        borderRadius: '999px',
                        color: emailTheme.brand,
                        fontSize: '10px',
                        fontWeight: 800,
                        lineHeight: '19px',
                        textAlign: 'center',
                      }}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td style={{ padding: '5px 0', color: emailTheme.muted, fontSize: '12px', lineHeight: '1.6' }}>
                    {item}
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </Section>
      </Section>

      <Section style={{ padding: '22px 30px 30px' }}>
        <Text
          style={{
            color: emailTheme.subtle,
            fontSize: '10px',
            lineHeight: '1.6',
            margin: 0,
            textAlign: 'center',
          }}
        >
          单次告警可能由瞬时信号波动引起。建议结合仪表盘历史趋势、连续采集结果和设备实际网络体验综合判断。
        </Text>
      </Section>

      <Footer generatedAt={data.timestamp} note="此邮件由已启用的告警规则自动触发。静默期内相同规则不会重复发送。" />
    </Layout>
  );
}
