export const ALERT_OPERATORS = ['>', '<', '>=', '<='] as const;
export type AlertOperator = (typeof ALERT_OPERATORS)[number];

export type AlertSeverity = 'info' | 'warning' | 'critical';

export const ALERT_METRIC_DEFINITIONS = {
  traffic_down: {
    label: '区间下载流量',
    unit: 'MB',
    hint: '相邻两次采集之间产生的下载流量。',
    guidance: [
      '查看在线设备排行，确认主要流量来源。',
      '检查是否有系统更新、云备份、下载或视频任务。',
      '结合套餐用量和连续采集趋势判断是否需要限制设备。',
    ],
  },
  traffic_up: {
    label: '区间上传流量',
    unit: 'MB',
    hint: '相邻两次采集之间产生的上传流量。',
    guidance: [
      '查看在线设备排行，确认主要流量来源。',
      '检查是否有云备份、同步或上传任务。',
      '结合套餐用量和连续采集趋势判断是否需要限制设备。',
    ],
  },
  download_rate: {
    label: '平均下载速率',
    unit: 'Mbps',
    hint: '根据相邻采集点计算的平均下载速率。',
    guidance: [
      '查看在线设备排行，确认主要速率来源。',
      '检查是否有下载、视频或系统更新任务。',
      '对比历史趋势判断是否属于短时峰值。',
    ],
  },
  upload_rate: {
    label: '平均上传速率',
    unit: 'Mbps',
    hint: '根据相邻采集点计算的平均上传速率。',
    guidance: [
      '查看在线设备排行，确认主要速率来源。',
      '检查是否有云备份、同步或上传任务。',
      '对比历史趋势判断是否属于短时峰值。',
    ],
  },
  devices: {
    label: '在线设备数量',
    unit: '台',
    hint: '采集时刻在线的终端数量。',
    guidance: [
      '检查在线设备列表是否出现陌生终端。',
      '核对设备名称、IP、MAC 和接入频段。',
    ],
  },
  rsrp: {
    label: '参考信号接收功率 (RSRP)',
    unit: 'dBm',
    hint: '参考信号接收功率，数值越接近 0 越强。',
    guidance: [
      '检查 CPE 摆放位置、天线方向和室内遮挡。',
      '对比过去 24 小时趋势，确认是持续覆盖不足还是瞬时波动。',
      '观察频段和 Cell ID 是否发生切换。',
    ],
  },
  rsrq: {
    label: '参考信号接收质量 (RSRQ)',
    unit: 'dB',
    hint: '参考信号接收质量，数值越接近 0 越好。',
    guidance: [
      '检查当前频段是否存在明显干扰或高负载。',
      '对比 RSRP：信号强但质量差通常更可能是干扰问题。',
      '观察小区、PCI 和频段切换后指标是否恢复。',
    ],
  },
  sinr: {
    label: '信噪比 (SINR)',
    unit: 'dB',
    hint: '信号与干扰噪声比，通常越高越好。',
    guidance: [
      '检查当前频段是否存在明显干扰或高负载。',
      '对比 RSRP：信号强但质量差通常更可能是干扰问题。',
      '观察小区、PCI 和频段切换后指标是否恢复。',
    ],
  },
  rssi: {
    label: '接收信号强度 (RSSI)',
    unit: 'dBm',
    hint: '接收信号总强度，数值越接近 0 越强。',
    guidance: [
      '检查 CPE 摆放位置、天线方向和室内遮挡。',
      '对比过去 24 小时趋势，确认是持续覆盖不足还是瞬时波动。',
      '观察频段和 Cell ID 是否发生切换。',
    ],
  },
  signal: {
    label: '兼容信号强度',
    unit: 'dBm',
    hint: '旧规则兼容字段，新规则建议使用 RSRP。',
    guidance: ['查看仪表盘历史趋势并核对最近采集状态。'],
  },
  collection_failures: {
    label: '连续采集失败',
    unit: '次',
    hint: '最近连续失败的采集次数，建议设置为大于等于 1。',
    guidance: [
      '检查 CPE 管理地址能否从服务端访问，以及设备是否正在重启。',
      '检查持久化会话是否失效，并确认 CPE 密码和登录限制。',
      '查看采集批次错误信息，确认是否存在接口超时或并发访问。',
    ],
  },
} as const;

export type AlertMetricType = keyof typeof ALERT_METRIC_DEFINITIONS;

export const ALERT_METRIC_TYPES = Object.keys(
  ALERT_METRIC_DEFINITIONS,
) as AlertMetricType[];

export function isAlertMetricType(value: unknown): value is AlertMetricType {
  return typeof value === 'string' && value in ALERT_METRIC_DEFINITIONS;
}

export function isAlertOperator(value: unknown): value is AlertOperator {
  return typeof value === 'string' && ALERT_OPERATORS.includes(value as AlertOperator);
}

export function getAlertMetricDefinition(metricType: AlertMetricType) {
  return ALERT_METRIC_DEFINITIONS[metricType];
}

export function getAlertSeverity(metricType: AlertMetricType, value: number): AlertSeverity {
  switch (metricType) {
    case 'collection_failures': return value >= 3 ? 'critical' : 'warning';
    case 'rsrp': return value < -105 ? 'critical' : 'warning';
    case 'rsrq': return value < -20 ? 'critical' : 'warning';
    case 'sinr': return value < 0 ? 'critical' : 'warning';
    case 'rssi': return value < -95 ? 'critical' : 'warning';
    case 'devices': return 'info';
    default: return 'warning';
  }
}
