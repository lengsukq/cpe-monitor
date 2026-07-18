import { Section, Text } from '@react-email/components';
import type { DeviceRanking } from '@/types';
import { formatBytes } from '@/lib/format';

interface DeviceTableProps {
  devices: DeviceRanking[];
}

export default function DeviceTable({ devices }: DeviceTableProps) {
  const maxTotal = devices.length > 0
    ? Math.max(...devices.map((d) => d.totalBytes))
    : 0;

  return (
    <Section style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e8f0f5' }}>
      {/* Header */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#eef4f8' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#5a6a78', textTransform: 'uppercase', letterSpacing: '0.5px', width: '30px' }}>#</th>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#5a6a78', textTransform: 'uppercase', letterSpacing: '0.5px' }}>设备名称</th>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#5a6a78', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IP 地址</th>
            <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#5a6a78', textTransform: 'uppercase', letterSpacing: '0.5px', width: '120px' }}>下载</th>
            <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#5a6a78', textTransform: 'uppercase', letterSpacing: '0.5px', width: '100px' }}>上传</th>
          </tr>
        </thead>
        <tbody>
          {devices.slice(0, 10).map((device, index) => {
            const pct = maxTotal > 0 ? Math.round((device.totalBytes / maxTotal) * 100) : 0;
            const bgColor = index % 2 === 0 ? '#ffffff' : '#fafcfd';
            return (
              <tr key={device.mac} style={{ background: bgColor }}>
                <td style={{ padding: '10px 14px', color: '#8a9aa8', fontSize: '13px', fontWeight: 600 }}>
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td style={{ padding: '10px 14px', color: '#1a2a36', fontSize: '13px', fontWeight: 500 }}>
                  {device.name}
                </td>
                <td style={{ padding: '10px 14px', color: '#8a9aa8', fontSize: '13px' }}>
                  {device.ip}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#2c7a9e', fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatBytes(device.downloadBytes)}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#3b8db0', fontSize: '13px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {formatBytes(device.uploadBytes)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mini bar chart across full width */}
      {devices.length > 0 && (
        <div style={{ padding: '0 14px 12px 14px' }}>
          <div style={{ height: '4px', background: '#e8f0f5', borderRadius: '2px', overflow: 'hidden', display: 'flex' }}>
            {devices.slice(0, 10).map((device, index) => {
              const pct = maxTotal > 0 ? Math.max(3, (device.totalBytes / maxTotal) * 100) : 0;
              const colorOptions = ['#2c7a9e', '#3b8db0', '#4da0c4', '#5bb8d9', '#6fc8e8', '#3a8baa', '#4a9bb8', '#5aabcd', '#6abce0', '#7accee'];
              return (
                <div
                  key={device.mac}
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: colorOptions[index % colorOptions.length],
                    minWidth: '4px',
                  }}
                />
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '10px', color: '#aab8c4' }}>流量分布</span>
            <span style={{ fontSize: '10px', color: '#aab8c4' }}>
              {devices.length} 台设备
            </span>
          </div>
        </div>
      )}
    </Section>
  );
}
