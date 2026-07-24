'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Callout } from '@/components/Callout';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { ExportCsvButton } from '@/components/ExportCsvButton';
import { DailyReportDialog } from '@/features/reports/components/DailyReportDialog';
import { DailyReportFilters } from '@/features/reports/components/DailyReportFilters';
import { DailyReportsOverview } from '@/features/reports/components/DailyReportsOverview';
import { ReportTrendCharts } from '@/features/reports/components/ReportTrendCharts';
import { DailyReportsView } from '@/features/reports/components/DailyReportsView';
import { PeriodReportsView } from '@/features/reports/components/PeriodReportsView';
import { useDailyReports } from '@/features/reports/hooks/useDailyReports';
import { cn } from '@/lib/utils';

type ReportTab = 'daily' | 'weekly' | 'monthly';

const TABS: Array<{ id: ReportTab; label: string }> = [
  { id: 'daily', label: '日报' },
  { id: 'weekly', label: '周报' },
  { id: 'monthly', label: '月报' },
];

export default function ReportsPage() {
  const reports = useDailyReports();
  const [tab, setTab] = useState<ReportTab>('daily');

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / report center"
        title="流量报告"
        description="汇总每日/每周/每月流量、峰值时段、网络质量与设备使用排名。"
        icon={<TrendingUp className="h-6 w-6" />}
        actions={
          <div className="flex items-center gap-2">
            <ExportCsvButton href="/api/export/reports" />
            {tab === 'daily' && (
              <Button onClick={() => { void reports.generatePreview(); }}>生成今日预览</Button>
            )}
          </div>
        }
      />

      {/* Tab switcher */}
      <div className="flex w-fit rounded-full bg-muted/50 p-1 text-sm ring-1 ring-border/60">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-full px-4 py-1.5 font-medium transition',
              tab === t.id
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <>
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
        </>
      )}
      {tab === 'weekly' && <PeriodReportsView type="weekly" />}
      {tab === 'monthly' && <PeriodReportsView type="monthly" />}
    </PageShell>
  );
}
