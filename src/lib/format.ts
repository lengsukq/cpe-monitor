/**
 * Shared formatting utilities for CPEye dashboard.
 * Single source of truth for all data display formatting.
 */

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0 || Number.isNaN(bytes)) {
    return '0 B';
  }
  const absoluteBytes = Math.abs(bytes);
  const base = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(absoluteBytes) / Math.log(base)),
    sizes.length - 1,
  );
  return `${parseFloat((bytes / Math.pow(base, unitIndex)).toFixed(1))} ${sizes[unitIndex]}`;
}

export function formatWithUnit(bytes: number, unit: 'MB' | 'GB'): string {
  if (bytes === 0) return '0 ' + unit;
  const divisor = unit === 'GB' ? 1073741824 : 1048576;
  return (bytes / divisor).toFixed(2) + ' ' + unit;
}

/** CPE traffic-rate fields are bytes per second; the router UI displays bits/s. */
export function formatRate(bytesPerSecond: number): string {
  const bitsPerSecond = Math.max(0, bytesPerSecond) * 8;
  if (bitsPerSecond >= 1_000_000_000) return (bitsPerSecond / 1_000_000_000).toFixed(1) + ' Gbps';
  if (bitsPerSecond >= 1_000_000) return (bitsPerSecond / 1_000_000).toFixed(1) + ' Mbps';
  if (bitsPerSecond >= 1_000) return (bitsPerSecond / 1_000).toFixed(1) + ' Kbps';
  return Math.round(bytesPerSecond) + ' B/s';
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}小时${m}分钟`;
}

export function formatDurationFromString(secondsStr: string | undefined): string {
  return formatDuration(parseInt(secondsStr || '0'));
}

export function formatBytesFromString(bytesStr: string | undefined, inKB = false): string {
  let bytes = parseInt(bytesStr || '0');
  if (inKB) bytes = bytes * 1024;
  return formatBytes(bytes);
}

export function getSignalQuality(strength: number): { label: string; variant: 'success' | 'info' | 'warning' | 'danger' } | null {
  if (strength === 0) return null;
  if (strength >= -70) return { label: '优秀', variant: 'success' };
  if (strength >= -85) return { label: '良好', variant: 'info' };
  if (strength >= -100) return { label: '一般', variant: 'warning' };
  return { label: '差', variant: 'danger' };
}

export function getCarrier(mcc: string): string {
  const carriers: Record<string, string> = {
    '46000': '中国移动', '46002': '中国移动', '46007': '中国移动', '46008': '中国移动',
    '46001': '中国联通', '46006': '中国联通', '46009': '中国联通',
    '46003': '中国电信', '46005': '中国电信', '46011': '中国电信',
  };
  return carriers[mcc] || mcc || '-';
}

export function getNetworkType(onlineState: any): string {
  if (!onlineState?.CellData) return '未知';
  const mode = onlineState.CellData.WirelessNetworkMode;
  const map: Record<string, string> = { 'LTE': '4G LTE', 'NR': '5G NR', 'NSA': '5G NSA' };
  return map[mode] || mode || '未知';
}

export function getDeviceIcon(iconType: string): string {
  const map: Record<string, string> = {
    computer: '💻', mobile: '📱', tablet: '📱', router: '📡',
    tv: '📺', printer: '🖨️', camera: '📷', game: '🎮',
  };
  return map[iconType?.toLowerCase()] || '🖥️';
}

export function getUpdateStateLabel(state: string | undefined): string {
  const map: Record<string, string> = {
    '16': '空闲',
    '17': '检查中',
    '32': '有可用更新',
    unknown: '未知',
  };
  return map[state || 'unknown'] || `状态 ${state}`;
}

export function formatDateTimeShanghai(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

export function formatSyncTime(value: string | null | undefined): string {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

export function formatLocalTime(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return '-';
  return value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function maskSecret(value: string): string {
  if (!value) return '—';
  if (value.length <= 12) return '••••••••';
  return `${value.slice(0, 18)}…${value.slice(-6)}`;
}
