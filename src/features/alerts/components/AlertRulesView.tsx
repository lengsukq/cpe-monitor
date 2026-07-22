import { Mail, MessageCircle, Pencil, TimerReset, Trash2 } from 'lucide-react';
import DataTableCard from '@/components/DataTableCard';
import ResponsiveDataView from '@/components/ResponsiveDataView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import type { AlertRule } from '@/types';
import {
  getAlertMetricHint,
  getAlertMetricLabel,
  getAlertMetricUnit,
  getAlertOperatorLabel,
} from '../model';

interface AlertRulesViewProps {
  rules: AlertRule[];
  totalCount: number;
  loading: boolean;
  updatingRuleId: number | null;
  onEdit: (rule: AlertRule) => void;
  onDelete: (id: number) => void;
  onToggle: (rule: AlertRule, enabled: boolean) => void;
}

export function AlertRulesView({
  rules,
  totalCount,
  loading,
  updatingRuleId,
  onEdit,
  onDelete,
  onToggle,
}: AlertRulesViewProps) {
  const emptyMessage = totalCount === 0 ? '暂无告警规则' : '没有符合条件的规则';

  return (
    <ResponsiveDataView
      loading={loading}
      isEmpty={rules.length === 0}
      emptyMessage={emptyMessage}
      mobile={rules.map((rule) => (
        <article key={rule.id} className="rounded-[26px] border border-border/65 bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">{rule.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{getAlertMetricLabel(rule.metricType)}</p>
            </div>
            <Badge variant={rule.enabled ? 'success' : 'secondary'}>
              {rule.enabled ? '已启用' : '已暂停'}
            </Badge>
          </div>

          <div className="fluid-card-grid mt-4 gap-2 [--fluid-card-min:8.5rem]">
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="text-[10px] font-medium text-muted-foreground">触发条件</p>
              <p className="mt-1 text-sm font-bold tabular-nums">
                {getAlertOperatorLabel(rule.operator)} {rule.threshold} {getAlertMetricUnit(rule.metricType)}
              </p>
            </div>
            <div className="rounded-2xl bg-muted/40 p-3">
              <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <TimerReset className="h-3 w-3" />静默期
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums">{rule.cooldownMinutes} 分钟</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${rule.notifyEmail ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>
              <Mail className="h-3 w-3" />邮件{rule.notifyEmail ? '已开启' : '未开启'}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${rule.notifyWechat ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
              <MessageCircle className="h-3 w-3" />企微{rule.notifyWechat ? '已开启' : '未开启'}
            </span>
          </div>

          <p className="mt-3 text-xs leading-5 text-muted-foreground">{getAlertMetricHint(rule.metricType)}</p>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <label className="flex min-w-0 items-center gap-2 text-xs font-medium">
              <Switch
                checked={rule.enabled}
                disabled={updatingRuleId === rule.id}
                onCheckedChange={(value) => onToggle(rule, value)}
              />
              {updatingRuleId === rule.id ? '更新中…' : '启用监控'}
            </label>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" onClick={() => onEdit(rule)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />编辑
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(rule.id)}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />删除
              </Button>
            </div>
          </div>
        </article>
      ))}
      desktop={(
        <DataTableCard
          colSpan={6}
          loading={loading}
          isEmpty={rules.length === 0}
          emptyMessage={emptyMessage}
          columns={(
            <>
              <TableHead>名称</TableHead><TableHead>监控指标</TableHead><TableHead>条件</TableHead>
              <TableHead>通知方式</TableHead><TableHead>状态</TableHead><TableHead>操作</TableHead>
            </>
          )}
        >
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-medium">{rule.name}</TableCell>
              <TableCell>{getAlertMetricLabel(rule.metricType)}</TableCell>
              <TableCell>{getAlertOperatorLabel(rule.operator)} {rule.threshold} {getAlertMetricUnit(rule.metricType)}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {rule.notifyEmail ? <Badge variant="info">邮件</Badge> : null}
                  {rule.notifyWechat ? <Badge variant="success">企微</Badge> : null}
                  {!rule.notifyEmail && !rule.notifyWechat ? <span className="text-muted-foreground">未配置</span> : null}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.enabled} disabled={updatingRuleId === rule.id} onCheckedChange={(value) => onToggle(rule, value)} />
                  <span className="text-xs text-muted-foreground">
                    {updatingRuleId === rule.id ? '更新中' : rule.enabled ? '启用' : '禁用'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onEdit(rule)}><Pencil className="mr-1 h-3.5 w-3.5" />编辑</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(rule.id)}><Trash2 className="mr-1 h-3.5 w-3.5" />删除</Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </DataTableCard>
      )}
    />
  );
}
