import { Section, Text } from '@react-email/components';

interface QualityBadgeProps {
  quality: string;
}

const colorMap: Record<string, { bg: string; text: string; dot: string }> = {
  '优秀': { bg: '#e6f7ed', text: '#16a34a', dot: '#22c55e' },
  '良好': { bg: '#e6f0fa', text: '#2c7a9e', dot: '#3b8db0' },
  '一般': { bg: '#fef7e6', text: '#b8860b', dot: '#eab308' },
  '差': { bg: '#fde8e8', text: '#dc2626', dot: '#ef4444' },
  '数据不足': { bg: '#f1f5f9', text: '#6b7a88', dot: '#94a3b8' },
};

export default function QualityBadge({ quality }: QualityBadgeProps) {
  const colors = colorMap[quality] || colorMap['数据不足'];

  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tr>
        <td
          style={{
            background: colors.bg,
            borderRadius: '20px',
            padding: '8px 18px',
          }}
        >
          <table style={{ borderCollapse: 'collapse' }}>
            <tr>
              <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: colors.dot,
                  }}
                />
              </td>
              <td style={{ verticalAlign: 'middle' }}>
                <span
                  style={{
                    color: colors.text,
                    fontSize: '13px',
                    fontWeight: 700,
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  网络质量: {quality}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  );
}
