import { Section } from '@react-email/components';
import { formatBytes } from '@/lib/format';
import { emailTheme } from './Layout';

export interface DeviceTableItem {
  name: string;
  ip?: string;
  mac?: string;
  uploadBytes: number;
  downloadBytes: number;
  totalBytes?: number;
  uploadBps?: number;
  downloadBps?: number;
  interfaceType?: string;
  frequency?: string;
  rssi?: number | null;
}

interface DeviceTableProps {
  devices: DeviceTableItem[];
  showConnection?: boolean;
}

function formatBitsPerSecond(value: number | null | undefined): string {
  const bps = Math.max(0, value || 0);
  if (bps >= 1_000_000_000) return `${(bps / 1_000_000_000).toFixed(1)} Gbps`;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(1)} Kbps`;
  return `${Math.round(bps)} bps`;
}

export default function DeviceTable({ devices, showConnection = false }: DeviceTableProps) {
  const visibleDevices = devices.slice(0, 10);
  const maxTotal = Math.max(
    0,
    ...visibleDevices.map((device) => (
      device.totalBytes ?? device.uploadBytes + device.downloadBytes
    )),
  );

  return (
    <Section
      style={{
        overflow: 'hidden',
        border: `1px solid ${emailTheme.border}`,
        borderRadius: '12px',
      }}
    >
      <table role="presentation" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#edf4f7' }}>
            <th style={headerCellStyle}>#</th>
            <th style={headerCellStyle}>设备</th>
            {showConnection ? <th style={headerCellStyle}>接入 / 信号</th> : null}
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>下载</th>
            <th style={{ ...headerCellStyle, textAlign: 'right' }}>上传</th>
          </tr>
        </thead>
        <tbody>
          {visibleDevices.map((device, index) => {
            const totalBytes = device.totalBytes ?? device.uploadBytes + device.downloadBytes;
            const percent = maxTotal > 0 ? Math.max(2, (totalBytes / maxTotal) * 100) : 0;
            const connection = [device.interfaceType, device.frequency].filter(Boolean).join(' · ');
            return (
              <tr key={device.mac || `${device.name}-${index}`} style={{ backgroundColor: index % 2 ? '#fbfdfe' : '#ffffff' }}>
                <td style={{ ...bodyCellStyle, width: '28px', color: emailTheme.subtle }}>
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td style={bodyCellStyle}>
                  <div style={{ color: emailTheme.text, fontWeight: 700 }}>{device.name}</div>
                  <div style={{ color: emailTheme.subtle, fontSize: '10px', marginTop: '3px' }}>
                    {[device.ip, device.mac].filter(Boolean).join(' · ') || '未提供地址'}
                  </div>
                  <div style={{ height: '4px', marginTop: '7px', overflow: 'hidden', backgroundColor: '#e5edf2', borderRadius: '999px' }}>
                    <div style={{ width: `${percent}%`, height: '4px', backgroundColor: emailTheme.brand, borderRadius: '999px' }} />
                  </div>
                </td>
                {showConnection ? (
                  <td style={bodyCellStyle}>
                    <div style={{ color: emailTheme.muted }}>{connection || '未知接入'}</div>
                    <div style={{ color: emailTheme.subtle, fontSize: '10px', marginTop: '3px' }}>
                      {device.rssi === null || device.rssi === undefined ? 'RSSI —' : `RSSI ${device.rssi} dBm`}
                    </div>
                  </td>
                ) : null}
                <td style={{ ...bodyCellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ color: emailTheme.brandDark, fontWeight: 700 }}>{formatBytes(device.downloadBytes)}</div>
                  {device.downloadBps !== undefined ? (
                    <div style={{ color: emailTheme.subtle, fontSize: '10px', marginTop: '3px' }}>
                      {formatBitsPerSecond(device.downloadBps)}
                    </div>
                  ) : null}
                </td>
                <td style={{ ...bodyCellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ color: '#347c92', fontWeight: 700 }}>{formatBytes(device.uploadBytes)}</div>
                  {device.uploadBps !== undefined ? (
                    <div style={{ color: emailTheme.subtle, fontSize: '10px', marginTop: '3px' }}>
                      {formatBitsPerSecond(device.uploadBps)}
                    </div>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Section>
  );
}

const headerCellStyle: React.CSSProperties = {
  padding: '10px 11px',
  color: emailTheme.muted,
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '.55px',
  textAlign: 'left',
  textTransform: 'uppercase',
};

const bodyCellStyle: React.CSSProperties = {
  padding: '11px',
  borderTop: `1px solid ${emailTheme.borderSoft}`,
  color: emailTheme.muted,
  fontSize: '11px',
  lineHeight: '1.4',
  verticalAlign: 'middle',
};
