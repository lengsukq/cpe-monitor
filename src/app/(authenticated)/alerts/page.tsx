'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Bell,
  BellOff,
  Mail,
  MessageCircle,
  Pencil,
  Search,
  SlidersHorizontal,
  TimerReset,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
import ResponsiveDataView from '@/components/ResponsiveDataView';
import {
  OverviewBars,
  OverviewDonut,
  OverviewSegments,
} from '@/components/overview/OverviewMiniCharts';
import { Callout } from '@/components/Callout';
import DataTableCard from '@/components/DataTableCard';
import FieldGroup from '@/components/forms/FieldGroup';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { TableCell, TableHead, TableRow } from '@/components/ui/table';
import { apiFetch } from '@/lib/client-api';
import type { AlertRule } from '@/types';

const metricTypes = [
  {
    value: 'traffic_down',
    label: '区间下载流量',
    unit: 'MB',
    hint: '相邻两次采集之间产生的下载流量。',
  },
  {
    value: 'traffic_up',
    label: '区间上传流量',
    unit: 'MB',
    hint: '相邻两次采集之间产生的上传流量。',
  },
  {
    value: 'download_rate',
    label: '平均下载速率',
    unit: 'Mbps',
    hint: '根据相邻采集点计算的平均下载速率。',
  },
  {
    value: 'upload_rate',
    label: '平均上传速率',
    unit: 'Mbps',
    hint: '根据相邻采集点计算的平均上传速率。',
  },
  { value: 'devices', label: '在线设备数量', unit: '台', hint: '采集时刻在线的终端数量。' },
  { value: 'rsrp', label: 'RSRP', unit: 'dBm', hint: '参考信号接收功率，数值越接近 0 越强。' },
  { value: 'rsrq', label: 'RSRQ', unit: 'dB', hint: '参考信号接收质量，数值越接近 0 越好。' },
  { value: 'sinr', label: 'SINR', unit: 'dB', hint: '信号与干扰噪声比，通常越高越好。' },
  { value: 'rssi', label: 'RSSI', unit: 'dBm', hint: '接收信号总强度，数值越接近 0 越强。' },
  { value: 'signal', label: '兼容信号强度', unit: 'dBm', hint: '旧规则兼容字段，新规则建议使用 RSRP。' },
  {
    value: 'collection_failures',
    label: '连续采集失败',
    unit: '次',
    hint: '最近连续失败的采集次数，建议设置为大于等于 1。',
  },
] as const;

const operators = [
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
  { value: '>=', label: '大于等于' },
  { value: '<=', label: '小于等于' },
] as const;

type MetricType = AlertRule['metricType'];
type Operator = AlertRule['operator'];

const emptyForm = {
  name: '',
  metricType: 'traffic_down' as MetricType,
  threshold: 0,
  operator: '>' as Operator,
  enabled: true,
  notifyEmail: true,
  notifyWechat: true,
  cooldownMinutes: 30,
};

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const [updatingRuleId, setUpdatingRuleId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  useEffect(() => {
    void fetchRules();
  }, []);

  async function fetchRules() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<AlertRule[]>('/api/alerts/rules', undefined, '获取告警规则失败');
      setRules(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '获取告警规则失败');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingRule(null);
    setFormData(emptyForm);
    setIsOpen(true);
  }

  function openEditModal(rule: AlertRule) {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      metricType: rule.metricType,
      threshold: rule.threshold,
      operator: rule.operator,
      enabled: rule.enabled,
      notifyEmail: rule.notifyEmail,
      notifyWechat: rule.notifyWechat,
      cooldownMinutes: rule.cooldownMinutes,
    });
    setIsOpen(true);
  }

  async function saveRule() {
    setError('');
    try {
      await apiFetch(
        '/api/alerts/rules',
        {
          method: editingRule ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingRule ? { id: editingRule.id, ...formData } : formData),
        },
        '保存告警规则失败',
      );
      await fetchRules();
      setIsOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存告警规则失败');
    }
  }

  async function deleteRule(id: number) {
    if (!confirm('确定要删除这条规则吗？')) return;
    setError('');
    try {
      await apiFetch(`/api/alerts/rules?id=${id}`, { method: 'DELETE' }, '删除告警规则失败');
      await fetchRules();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除告警规则失败');
    }
  }

  async function toggleRule(rule: AlertRule, enabled: boolean) {
    setUpdatingRuleId(rule.id);
    setError('');
    try {
      await apiFetch(
        '/api/alerts/rules',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: rule.id,
            name: rule.name,
            metricType: rule.metricType,
            threshold: rule.threshold,
            operator: rule.operator,
            enabled,
            notifyEmail: rule.notifyEmail,
            notifyWechat: rule.notifyWechat,
            cooldownMinutes: rule.cooldownMinutes,
          }),
        },
        '更新规则状态失败',
      );
      setRules((current) => current.map((item) => (
        item.id === rule.id ? { ...item, enabled } : item
      )));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : '更新规则状态失败');
    } finally {
      setUpdatingRuleId(null);
    }
  }

  const getMetricLabel = (type: string) => metricTypes.find((item) => item.value === type)?.label || type;
  const getMetricUnit = (type: string) => metricTypes.find((item) => item.value === type)?.unit || '';
  const getMetricHint = (type: string) => metricTypes.find((item) => item.value === type)?.hint || '';
  const getOperatorLabel = (operator: string) => operators.find((item) => item.value === operator)?.label || operator;
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const disabledCount = rules.length - enabledCount;
  const emailCount = rules.filter((rule) => rule.notifyEmail).length;
  const wechatCount = rules.filter((rule) => rule.notifyWechat).length;
  const metricDistribution = metricTypes.map((metric) => (
    rules.filter((rule) => rule.metricType === metric.value).length
  ));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleRules = rules.filter((rule) => {
    const matchesQuery = !normalizedQuery || [
      rule.name,
      getMetricLabel(rule.metricType),
      getMetricUnit(rule.metricType),
    ].join(' ').toLocaleLowerCase().includes(normalizedQuery);
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'enabled' ? rule.enabled : !rule.enabled);
    return matchesQuery && matchesStatus;
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="CPE / alert center"
        title="告警规则"
        description="为区间流量、平均速率、射频质量、设备数量和采集失败设定阈值。"
        icon={<Bell className="h-6 w-6" />}
        actions={<Button onClick={openCreateModal}>新建规则</Button>}
      />

      <PageOverview
        eyebrow={<><Bell className="h-3.5 w-3.5" />Alerts / rules</>}
        title="告警概览"
        description="规则启用情况与通知覆盖，便于快速判断监控是否就绪。"
        items={[
          {
            label: '规则总数',
            value: loading ? '…' : String(rules.length),
            detail: '已配置的告警规则',
            icon: <Bell className="h-3.5 w-3.5" />,
            chart: (
              <OverviewBars
                values={metricDistribution}
                label="告警指标类型分布"
                className="text-brand"
              />
            ),
          },
          {
            label: '已启用',
            value: loading ? '…' : String(enabledCount),
            detail: '当前生效的规则',
            icon: <Activity className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={enabledCount}
                total={Math.max(rules.length, 1)}
                label="已启用规则占比"
                className="text-success"
              />
            ),
          },
          {
            label: '已禁用',
            value: loading ? '…' : String(disabledCount),
            detail: '暂停监控的规则',
            icon: <BellOff className="h-3.5 w-3.5" />,
            chart: (
              <OverviewDonut
                value={disabledCount}
                total={Math.max(rules.length, 1)}
                label="已禁用规则占比"
                className="text-muted-foreground"
              />
            ),
          },
          {
            label: '邮件通知',
            value: loading ? '…' : String(emailCount),
            detail: '会发送邮件的规则数',
            icon: <Mail className="h-3.5 w-3.5" />,
            chart: (
              <OverviewSegments
                segments={[
                  { label: '邮件', value: emailCount },
                  { label: '企微', value: wechatCount },
                ]}
                label="告警通知渠道覆盖"
              />
            ),
          },
        ]}
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}

      <section className="app-panel grid gap-3 p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center sm:p-4">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索规则名称或监控指标"
            className="h-10 rounded-xl pl-9"
          />
        </div>
        <label className="relative min-w-0">
          <span className="sr-only">规则状态</span>
          <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'enabled' | 'disabled')}
            className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
          >
            <option value="all">全部状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">已暂停</option>
          </select>
        </label>
        <span className="shrink-0 text-center text-xs text-muted-foreground sm:text-left">
          显示 {visibleRules.length} / {rules.length} 条
        </span>
      </section>

      <ResponsiveDataView
        loading={loading}
        isEmpty={visibleRules.length === 0}
        emptyMessage={rules.length === 0 ? '暂无告警规则' : '没有符合条件的规则'}
        mobile={visibleRules.map((rule) => (
          <article
            key={rule.id}
            className="rounded-[26px] border border-border/65 bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-foreground">{rule.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getMetricLabel(rule.metricType)}
                </p>
              </div>
              <Badge variant={rule.enabled ? 'success' : 'secondary'}>
                {rule.enabled ? '已启用' : '已暂停'}
              </Badge>
            </div>

            <div className="fluid-card-grid mt-4 gap-2 [--fluid-card-min:8.5rem]">
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="text-[10px] font-medium text-muted-foreground">触发条件</p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {getOperatorLabel(rule.operator)} {rule.threshold} {getMetricUnit(rule.metricType)}
                </p>
              </div>
              <div className="rounded-2xl bg-muted/40 p-3">
                <p className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <TimerReset className="h-3 w-3" />
                  静默期
                </p>
                <p className="mt-1 text-sm font-bold tabular-nums">
                  {rule.cooldownMinutes} 分钟
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${rule.notifyEmail ? 'bg-info/10 text-info' : 'bg-muted text-muted-foreground'}`}>
                <Mail className="h-3 w-3" />
                邮件{rule.notifyEmail ? '已开启' : '未开启'}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${rule.notifyWechat ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                <MessageCircle className="h-3 w-3" />
                企微{rule.notifyWechat ? '已开启' : '未开启'}
              </span>
            </div>

            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {getMetricHint(rule.metricType)}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
              <label className="flex min-w-0 items-center gap-2 text-xs font-medium">
                <Switch
                  checked={rule.enabled}
                  disabled={updatingRuleId === rule.id}
                  onCheckedChange={(value) => { void toggleRule(rule, value); }}
                />
                {updatingRuleId === rule.id ? '更新中…' : '启用监控'}
              </label>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEditModal(rule)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" />
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => { void deleteRule(rule.id); }}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  删除
                </Button>
              </div>
            </div>
          </article>
        ))}
        desktop={(
          <DataTableCard
            colSpan={6}
            loading={loading}
            isEmpty={visibleRules.length === 0}
            emptyMessage={rules.length === 0 ? '暂无告警规则' : '没有符合条件的规则'}
            columns={
              <>
                <TableHead>名称</TableHead>
                <TableHead>监控指标</TableHead>
                <TableHead>条件</TableHead>
                <TableHead>通知方式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </>
            }
          >
            {visibleRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>{getMetricLabel(rule.metricType)}</TableCell>
                <TableCell>
                  {getOperatorLabel(rule.operator)} {rule.threshold} {getMetricUnit(rule.metricType)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.notifyEmail ? <Badge variant="info">邮件</Badge> : null}
                    {rule.notifyWechat ? <Badge variant="success">企微</Badge> : null}
                    {!rule.notifyEmail && !rule.notifyWechat ? <span className="text-muted-foreground">未配置</span> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      disabled={updatingRuleId === rule.id}
                      onCheckedChange={(value) => { void toggleRule(rule, value); }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {updatingRuleId === rule.id ? '更新中' : rule.enabled ? '启用' : '禁用'}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEditModal(rule)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => { void deleteRule(rule.id); }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </DataTableCard>
        )}
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[42rem] overflow-y-auto rounded-[28px] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingRule ? '编辑规则' : '新建规则'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FieldGroup label="规则名称">
              <Input
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              />
            </FieldGroup>

            <FieldGroup label="监控指标">
              <Select
                value={formData.metricType}
                onValueChange={(value) => setFormData({
                  ...formData,
                  metricType: (value ?? 'traffic_down') as MetricType,
                })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metricTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <div className="fluid-card-grid gap-4 [--fluid-card-min:14rem]">
              <FieldGroup label="运算符">
                <Select
                  value={formData.operator}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    operator: (value ?? '>') as Operator,
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator.value} value={operator.value}>{operator.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup
                label={`阈值（${getMetricUnit(formData.metricType)}）`}
                hint={getMetricHint(formData.metricType)}
              >
                <Input
                  type="number"
                  step="any"
                  value={String(formData.threshold)}
                  onChange={(event) => setFormData({
                    ...formData,
                    threshold: Number(event.target.value),
                  })}
                />
              </FieldGroup>
            </div>

            <FieldGroup label="静默期 (分钟)">
              <Input
                type="number"
                min="1"
                max="10080"
                step="1"
                value={String(formData.cooldownMinutes)}
                onChange={(event) => setFormData({
                  ...formData,
                  cooldownMinutes: Number(event.target.value),
                })}
              />
            </FieldGroup>

            <div className="fluid-card-grid gap-3 [--fluid-card-min:11rem]">
              <div className="flex min-h-10 items-center gap-2">
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(value) => setFormData({ ...formData, enabled: value })}
                />
                <Label>启用规则</Label>
              </div>
              <div className="flex min-h-10 items-center gap-2">
                <Switch
                  checked={formData.notifyEmail}
                  onCheckedChange={(value) => setFormData({ ...formData, notifyEmail: value })}
                />
                <Label>邮件通知</Label>
              </div>
              <div className="flex min-h-10 items-center gap-2">
                <Switch
                  checked={formData.notifyWechat}
                  onCheckedChange={(value) => setFormData({ ...formData, notifyWechat: value })}
                />
                <Label>微信通知</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 -mx-4 -mb-4 mt-2 grid grid-cols-2 gap-2 border-t border-border/70 bg-background/95 p-4 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:flex sm:border-0 sm:bg-transparent sm:p-0">
            <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
            <Button onClick={() => { void saveRule(); }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
