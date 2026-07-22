import type { DailyReport, DeviceRanking } from '../../types/index.ts';

export interface ReportNotifications {
  emailConfigured: boolean;
  wechatConfigured: boolean;
  emailSent: boolean;
  wechatSent: boolean;
}

export interface DailyReportPreview extends DailyReport {
  notifications?: ReportNotifications;
}

export function getReportQualityVariant(quality: string | null) {
  switch (quality) {
    case '优秀': return 'success' as const;
    case '良好': return 'info' as const;
    case '一般': return 'warning' as const;
    case '差': return 'danger' as const;
    default: return 'secondary' as const;
  }
}

export function filterDailyReports(
  reports: DailyReport[],
  query: string,
  qualityFilter: string,
): DailyReport[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return reports.filter((report) => {
    const matchesQuery = !normalizedQuery || [
      report.reportDate,
      report.networkQuality,
      report.avgSignal,
    ].join(' ').toLocaleLowerCase().includes(normalizedQuery);
    const matchesQuality = qualityFilter === 'all' || report.networkQuality === qualityFilter;
    return matchesQuery && matchesQuality;
  });
}

export function getReportQualityOptions(reports: DailyReport[]): string[] {
  return Array.from(new Set(
    reports.map((report) => report.networkQuality).filter((value): value is string => Boolean(value)),
  ));
}

export function getReportOverviewStats(reports: DailyReport[]) {
  const latestReport = reports[0];
  const recentReports = reports.slice(0, 10).reverse();
  return {
    latestReport,
    trafficTrend: recentReports.map((report) => (
      (report.totalDownload || 0) + (report.totalUpload || 0)
    )),
    downloadTrend: recentReports.map((report) => report.totalDownload || 0),
    signalTrend: recentReports.map((report) => report.avgSignal),
  };
}

export function getPreviewDevices(report: DailyReportPreview | null): DeviceRanking[] {
  return Array.isArray(report?.topDevices) ? report.topDevices : [];
}
