'use client';

import { TrendingUp } from 'lucide-react';
import { Callout } from '@/components/Callout';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { DailyReportDialog } from '@/features/reports/components/DailyReportDialog';
import { DailyReportFilters } from '@/features/reports/components/DailyReportFilters';
import { DailyReportsOverview } from '@/features/reports/components/DailyReportsOverview';
import { ReportTrendCharts } from '@/features/reports/components/ReportTrendCharts';
import { DailyReportsView } from '@/features/reports/components/DailyReportsView';
import { useDailyReports } from '@/features/reports/hooks/useDailyReports';

export default function ReportsPage() {
  const reports = useDailyReports();
  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / report center"
        title="每日报告"
        description="汇总每日流量、峰值时段、网络质量与设备使用排名，便于回顾历史运行情况。"
        icon={<TrendingUp className="h-6 w-6" />}
        actions={<Button onClick={() => { void reports.generatePreview(); }}>生成今日预览</Button>}
      />
      <DailyReportsOverview total={reports.reports.length} loading={reports.loading} overview={reports.overview} />
      <ReportTrendCharts reports={reports.reports} loading={reports.loading} />
      {reports.error ? <Callout tone="danger">{reports.error}</Callout> : null}
      <DailyReportFilters
        query={reports.query}
        quality={reports.qualityFilter}
        qualityOptions={reports.qualityOptions}
        visibleCount={reports.visibleReports.length}
        totalCount={reports.reports.length}
        onQueryChange={reports.setQuery}
        onQualityChange={reports.setQualityFilter}
      />
      <DailyReportsView reports={reports.visibleReports} totalCount={reports.reports.length} loading={reports.loading} onOpen={reports.openReport} />
      <DailyReportDialog open={reports.isDialogOpen} report={reports.previewReport} topDevices={reports.topDevices} onOpenChange={reports.setIsDialogOpen} />
    </PageShell>
  );
}
