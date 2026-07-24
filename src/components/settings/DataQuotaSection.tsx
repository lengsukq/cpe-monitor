'use client';

import { Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import type { DataQuotaForm } from '@/features/settings/types';

interface DataQuotaSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DataQuotaForm;
  onChange: (value: DataQuotaForm) => void;
  saving: boolean;
  onSave: () => void;
}

export function DataQuotaSection({
  open,
  onOpenChange,
  value,
  onChange,
  saving,
  onSave,
}: DataQuotaSectionProps) {
  return (
    <SettingsAccordionSection
      id="data-quota"
      icon={<Gauge className="h-4 w-4" />}
      eyebrow="Traffic budget"
      title="流量配额"
      description="设置月度流量上限，超出阈值时分级告警。"
      status={
        value.enabled ? (
          <Badge variant="secondary" className="bg-success/10 text-success">已启用</Badge>
        ) : (
          <Badge variant="secondary">未启用</Badge>
        )
      }
      summary={[
        { label: '月度上限', value: value.enabled ? `${value.quotaGb || '-'} GB` : '未设置' },
        { label: '告警阈值', value: value.enabled ? `${value.alertLevels || '80,90,100'}%` : '-' },
        { label: '重置日', value: value.enabled ? `每月 ${value.resetDay || '1'} 号` : '-' },
      ]}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
            className="h-4 w-4 rounded border-input accent-brand"
          />
          <span className="text-sm">启用流量配额告警</span>
        </label>

        {value.enabled && (
          <>
            <div className="space-y-2">
              <Label htmlFor="quota-gb">月度流量上限 (GB)</Label>
              <Input
                id="quota-gb"
                type="number"
                min={1}
                placeholder="100"
                value={value.quotaGb}
                onChange={(e) => onChange({ ...value, quotaGb: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-levels">告警阈值 (%)</Label>
              <Input
                id="alert-levels"
                placeholder="80,90,100"
                value={value.alertLevels}
                onChange={(e) => onChange({ ...value, alertLevels: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                用逗号分隔，达到对应百分比时触发告警。例如 80,90,100 表示使用量达到 80%、90%、100% 时分别告警。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-day">每月重置日</Label>
              <Input
                id="reset-day"
                type="number"
                min={1}
                max={28}
                placeholder="1"
                value={value.resetDay}
                onChange={(e) => onChange({ ...value, resetDay: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">流量统计从每月该日开始计算。</p>
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? '保存中…' : '保存配额设置'}
          </Button>
        </div>
      </div>
    </SettingsAccordionSection>
  );
}
