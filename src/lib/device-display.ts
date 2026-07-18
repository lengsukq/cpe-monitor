export function getDisplayValue(source: unknown, keys: string[]): string | undefined {
  if (!source) return undefined;
  if (typeof source === 'string') return source;
  if (typeof source !== 'object') return undefined;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    if (record[key]) return String(record[key]);
  }
  return undefined;
}

export function countTopology(topology: unknown): number {
  if (!Array.isArray(topology)) return 0;
  return topology.filter((item) => {
    const active = (item as { Active?: unknown })?.Active;
    return active === true || active === 1 || active === '1';
  }).length;
}

export function formatFlag(value: unknown, includeCode = false): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (value === true) return '是';
  if (value === false) return '否';
  const code = String(value);
  if (code === '1') return includeCode ? '是 (1)' : '是';
  if (code === '0') return includeCode ? '否 (0)' : '否';
  return code;
}

export function formatStatusCode(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const code = String(value);
  const labels: Record<string, string> = {
    '0': '否',
    '1': '正常',
    '2': '已启用',
    '901': '已连接',
  };
  return labels[code] ? `${labels[code]} (${code})` : code;
}

export function formatWifiCapability(value: unknown): string | undefined {
  if (value === 2 || value === '2') return '双频 Wi-Fi (2)';
  if (value === 1 || value === '1') return '单频 Wi-Fi (1)';
  return value === null || value === undefined || value === '' ? undefined : String(value);
}

export function formatFeatureState(value: unknown): string {
  if (!value) return '未返回';
  if (typeof value === 'string') return value || '已返回';
  if (typeof value !== 'object') return '已返回';
  const record = value as Record<string, unknown>;
  const status = record.Enable ?? record.enabled ?? record.Switch ?? record.DbhoEnable ?? record.portalEnable;
  if (status === '1' || status === 1 || status === true) return '已启用';
  if (status === '0' || status === 0 || status === false) return '未启用';
  return '已返回';
}
