'use client';

import { Bell } from 'lucide-react';
import { Callout } from '@/components/Callout';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { AlertRuleDialog } from '@/features/alerts/components/AlertRuleDialog';
import { AlertRuleFilters } from '@/features/alerts/components/AlertRuleFilters';
import { AlertRulesOverview } from '@/features/alerts/components/AlertRulesOverview';
import { AlertChartsPanel } from '@/features/alerts/components/AlertChartsPanel';
import { AlertRulesView } from '@/features/alerts/components/AlertRulesView';
import { useAlertRules } from '@/features/alerts/hooks/useAlertRules';

export default function AlertsPage() {
  const alerts = useAlertRules();

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / alert center"
        title="告警规则"
        description="为区间流量、平均速率、射频质量、设备数量和采集失败设定阈值。"
        icon={<Bell className="h-6 w-6" />}
        actions={<Button onClick={alerts.openCreateDialog}>新建规则</Button>}
      />

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
    </PageShell>
  );
}
