'use client';

import { Database, Save, Trash2 } from 'lucide-react';
import { SettingsAccordionSection } from '@/components/settings/SettingsAccordionSection';
import FieldGroup from '@/components/forms/FieldGroup';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatSyncTime } from '@/lib/format';
import type { DataRetentionForm } from '@/hooks/useSettingsPage';

interface DataRetentionSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DataRetentionForm;
  onChange: (value: DataRetentionForm) => void;
  saving: boolean;
  onSave: (cleanupNow: boolean) => void;
}

export function DataRetentionSection({
  open,
  onOpenChange,
  value,
  onChange,
  saving,
  onSave,
}: DataRetentionSectionProps) {
  return (
    <SettingsAccordionSection
      id="retention"
      icon={<Database className="h-3.5 w-3.5" />}
      eyebrow="Storage"
      title="历史数据保留"
      description="控制高频采样数据的保留周期，避免 SQLite 数据文件无限增长。"
      open={open}
      onOpenChange={onOpenChange}
      status={<Badge variant="outline">自动清理</Badge>}
      summary={[
        { label: '流量与设备历史', value: `${value.historyDays} 天` },
        { label: '采集运行记录', value: `${value.runDays} 天` },
        { label: '上次清理', value: formatSyncTime(value.lastCleanupAt) },
      ]}
    >
      <div className="fluid-card-grid gap-4 [--fluid-card-min:15rem]">
        <FieldGroup
          label="流量与设备历史（天）"
          hint="保留图表与单设备历史，范围 7–3650 天。"
        >
          <Input
            type="number"
            min="7"
            max="3650"
            step="1"
            value={value.historyDays}
            onChange={(event) => onChange({ ...value, historyDays: event.target.value })}
          />
        </FieldGroup>
        <FieldGroup
          label="采集运行记录（天）"
          hint="保留成功、失败和错误信息，范围 7–3650 天。"
        >
          <Input
            type="number"
            min="7"
            max="3650"
            step="1"
            value={value.runDays}
            onChange={(event) => onChange({ ...value, runDays: event.target.value })}
          />
        </FieldGroup>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
        自动清理最多每 12 小时执行一次，并且只删除超过保留期的数据。日报和告警日志不会被此设置删除。
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onSave(true)}
          disabled={saving}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          保存并立即清理
        </Button>
        <Button type="button" size="sm" onClick={() => onSave(false)} disabled={saving}>
          {saving ? '保存中…' : (
            <>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              保存保留策略
            </>
          )}
        </Button>
      </div>
    </SettingsAccordionSection>
  );
}

export default DataRetentionSection;
