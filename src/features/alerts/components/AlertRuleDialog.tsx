import FieldGroup from '@/components/forms/FieldGroup';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AlertRule } from '@/types';
import {
  alertMetricOptions,
  alertOperatorOptions,
  getAlertMetricHint,
  getAlertMetricUnit,
  type AlertMetricType,
  type AlertOperator,
  type AlertRuleFormData,
} from '../model';

interface AlertRuleDialogProps {
  open: boolean;
  editingRule: AlertRule | null;
  formData: AlertRuleFormData;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: AlertRuleFormData) => void;
  onSave: () => void;
}

export function AlertRuleDialog({
  open,
  editingRule,
  formData,
  onOpenChange,
  onFormChange,
  onSave,
}: AlertRuleDialogProps) {
  const update = <Key extends keyof AlertRuleFormData>(key: Key, value: AlertRuleFormData[Key]) => {
    onFormChange({ ...formData, [key]: value });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[42rem] overflow-y-auto rounded-[28px] p-4 sm:p-6">
        <DialogHeader><DialogTitle>{editingRule ? '编辑规则' : '新建规则'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <FieldGroup label="规则名称">
            <Input value={formData.name} onChange={(event) => update('name', event.target.value)} />
          </FieldGroup>
          <FieldGroup label="监控指标">
            <Select value={formData.metricType} onValueChange={(value) => update('metricType', (value ?? 'traffic_down') as AlertMetricType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {alertMetricOptions.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </FieldGroup>
          <div className="fluid-card-grid gap-4 [--fluid-card-min:14rem]">
            <FieldGroup label="运算符">
              <Select value={formData.operator} onValueChange={(value) => update('operator', (value ?? '>') as AlertOperator)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {alertOperatorOptions.map((operator) => <SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldGroup>
            <FieldGroup label={`阈值（${getAlertMetricUnit(formData.metricType)}）`} hint={getAlertMetricHint(formData.metricType)}>
              <Input type="number" step="any" value={String(formData.threshold)} onChange={(event) => update('threshold', Number(event.target.value))} />
            </FieldGroup>
          </div>
          <FieldGroup label="静默期 (分钟)">
            <Input type="number" min="1" max="10080" step="1" value={String(formData.cooldownMinutes)} onChange={(event) => update('cooldownMinutes', Number(event.target.value))} />
          </FieldGroup>
          <div className="fluid-card-grid gap-3 [--fluid-card-min:11rem]">
            <div className="flex min-h-10 items-center gap-2"><Switch checked={formData.enabled} onCheckedChange={(value) => update('enabled', value)} /><Label>启用规则</Label></div>
            <div className="flex min-h-10 items-center gap-2"><Switch checked={formData.notifyEmail} onCheckedChange={(value) => update('notifyEmail', value)} /><Label>邮件通知</Label></div>
            <div className="flex min-h-10 items-center gap-2"><Switch checked={formData.notifyWechat} onCheckedChange={(value) => update('notifyWechat', value)} /><Label>微信通知</Label></div>
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 mt-2 grid grid-cols-2 gap-2 border-t border-border/70 bg-background/95 p-4 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:flex sm:border-0 sm:bg-transparent sm:p-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={onSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
