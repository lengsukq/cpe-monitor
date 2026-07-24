'use client';

import { useState } from 'react';
import { Bell, History } from 'lucide-react';
import { Callout } from '@/components/Callout';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { AlertRuleDialog } from '@/features/alerts/components/AlertRuleDialog';
import { AlertRuleFilters } from '@/features/alerts/components/AlertRuleFilters';
import { AlertRulesOverview } from '@/features/alerts/components/AlertRulesOverview';
import { AlertChartsPanel } from '@/features/alerts/components/AlertChartsPanel';
import { AlertRulesView } from '@/features/alerts/components/AlertRulesView';
import { AlertHistoryView } from '@/features/alerts/components/AlertHistoryView';
import { useAlertRules } from '@/features/alerts/hooks/useAlertRules';
import { cn } from '@/lib/utils';

type AlertTab = 'rules' | 'history';

export default function AlertsPage() {
  const alerts = useAlertRules();
  const [tab, setTab] = useState<AlertTab>('rules');

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / alert center"
        title="告警中心"
        description="为区间流量、平均速率、射频质量、设备数量和采集失败设定阈值。"
        icon={<Bell className="h-6 w-6" />}
        actions={tab === 'rules' ? <Button onClick={alerts.openCreateDialog}>新建规则</Button> : undefined}
      />

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-2xl bg-muted/50 p-1 ring-1 ring-border/60 sm:w-fit">
        {([
          ['rules', '告警规则', Bell],
          ['history', '告警历史', History],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition sm:flex-none',
              tab === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'rules' ? (
        <>
          <AlertRulesOverview total={alerts.rules.length} loading={alerts.loading} stats={alerts.stats} />
          <AlertChartsPanel stats={alerts.stats} total={alerts.rules.length} loading={alerts.loading} />
          {alerts.error ? <Callout tone="danger">{alerts.error}</Callout> : null}
          <AlertRuleFilters
            query={alerts.query}
            status={alerts.statusFilter}
            visibleCount={alerts.visibleRules.length}
            totalCount={alerts.rules.length}
            onQueryChange={alerts.setQuery}
            onStatusChange={alerts.setStatusFilter}
          />
          <AlertRulesView
            rules={alerts.visibleRules}
            totalCount={alerts.rules.length}
            loading={alerts.loading}
            updatingRuleId={alerts.updatingRuleId}
            onEdit={alerts.openEditDialog}
            onDelete={(id) => { void alerts.deleteRule(id); }}
            onToggle={(rule, enabled) => { void alerts.toggleRule(rule, enabled); }}
          />
          <AlertRuleDialog
            open={alerts.isDialogOpen}
            editingRule={alerts.editingRule}
            formData={alerts.formData}
            onOpenChange={alerts.setIsDialogOpen}
            onFormChange={alerts.setFormData}
            onSave={() => { void alerts.saveRule(); }}
          />
        </>
      ) : (
        <AlertHistoryView />
      )}
    </PageShell>
  );
}
