import { Section, Text } from '@react-email/components';
import Layout, { emailTheme } from './components/Layout';
import Header from './components/Header';
import Footer from './components/Footer';
import SectionHeading from './components/SectionHeading';
import InfoTable from './components/InfoTable';
import StatusBadge from './components/StatusBadge';
import type { CpeSmsMessage } from '@/lib/cpe-client';

interface SmsNotificationEmailProps {
  data: CpeSmsMessage;
}

function formatDateTime(value: string): string {
  if (!value) return '未知时间';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
}

function getDirectionLabel(direction: CpeSmsMessage['direction']): string {
  return direction === 'outbound' ? '已发送' : '已接收';
}

export default function SmsNotificationEmail({ data }: SmsNotificationEmailProps) {
  const receivedAt = formatDateTime(data.date);
  const previewContent = data.content.replace(/\s+/g, ' ').trim().slice(0, 90);

  return (
    <Layout preview={`来自 ${data.phone || '未知号码'}：${previewContent}`}>
      <Header
        title="收到一条新短信"
        subtitle={`${receivedAt} · CPE 短信自动同步`}
        status={data.unread ? '未读' : getDirectionLabel(data.direction)}
        tone={data.unread ? 'info' : 'neutral'}
      />

      <Section style={{ padding: '26px 30px 0' }}>
        <SectionHeading
          title={data.phone || '未知号码'}
          description="短信正文已由 CPE Monitor 自动同步到本地数据库。"
          trailing={<StatusBadge tone={data.direction === 'inbound' ? 'success' : 'info'}>{getDirectionLabel(data.direction)}</StatusBadge>}
        />
        <Section
          style={{
            backgroundColor: '#f2f7f9',
            border: `1px solid ${emailTheme.border}`,
            borderLeft: `4px solid ${emailTheme.brand}`,
            borderRadius: '12px',
            padding: '18px 19px',
          }}
        >
          <Text
            style={{
              color: emailTheme.text,
              fontSize: '15px',
              lineHeight: '1.78',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {data.content || '（空短信）'}
          </Text>
        </Section>
      </Section>

      <Section style={{ padding: '24px 30px 0' }}>
        <SectionHeading title="短信信息" />
        <InfoTable rows={[
          { label: '发送号码', value: data.phone || '未知号码', mono: true, emphasis: true },
          { label: '短信时间', value: receivedAt },
          { label: '方向', value: getDirectionLabel(data.direction) },
          { label: '状态', value: data.unread ? '未读' : data.status || '已读' },
          { label: '所在信箱', value: data.box || '—' },
          { label: '消息 ID', value: data.id || '—', mono: true },
        ]} />
      </Section>

      <Section style={{ padding: '22px 30px 30px' }}>
        <table
          role="presentation"
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            backgroundColor: emailTheme.warningSoft,
            border: '1px solid #fed7aa',
            borderRadius: '12px',
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: '13px 15px' }}>
                <Text style={{ color: emailTheme.warning, fontSize: '11px', fontWeight: 700, lineHeight: '1.55', margin: 0 }}>
                  安全提示
                </Text>
                <Text style={{ color: '#8b5a2b', fontSize: '10px', lineHeight: '1.6', margin: '4px 0 0' }}>
                  请谨慎处理短信中的验证码、短链接和付款请求。此邮件仅用于通知，不会自动回复或转发短信。
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Footer generatedAt={receivedAt} note="此邮件由短信同步任务自动发送，不代表系统已回复该短信。" />
    </Layout>
  );
}
