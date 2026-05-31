/**
 * Shared formatting utilities for CPEye dashboard.
 * Single source of truth for all data display formatting.
 */

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatWithUnit(bytes: number, unit: 'MB' | 'GB'): string {
  if (bytes === 0) return '0 ' + unit;
  const divisor = unit === 'GB' ? 1073741824 : 1048576;
  return (bytes / divisor).toFixed(2) + ' ' + unit;
}

export function formatRate(kbps: number): string {
  if (kbps >= 1024) return (kbps / 1024).toFixed(1) + ' MB/s';
  return kbps + ' KB/s';
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

export function getSignalQuality(strength: number): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } | null {
  if (strength === 0) return null;
  if (strength >= -70) return { label: '优秀', variant: 'default' };
  if (strength >= -85) return { label: '良好', variant: 'secondary' };
  if (strength >= -100) return { label: '一般', variant: 'outline' };
  return { label: '差', variant: 'destructive' };
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
