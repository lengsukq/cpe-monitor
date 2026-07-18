'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Bell, BellOff, Mail } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageShell } from '@/components/PageShell';
import { PageOverview } from '@/components/PageOverview';
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
  { value: 'traffic_down', label: '下载流量', unit: 'MB' },
  { value: 'traffic_up', label: '上传流量', unit: 'MB' },
  { value: 'devices', label: '设备数量', unit: '台' },
  { value: 'signal', label: '信号强度', unit: 'dBm' },
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

  const getMetricLabel = (type: string) => metricTypes.find((item) => item.value === type)?.label || type;
  const getMetricUnit = (type: string) => metricTypes.find((item) => item.value === type)?.unit || '';
  const getOperatorLabel = (operator: string) => operators.find((item) => item.value === operator)?.label || operator;

  return (
    <PageShell>
      <PageHeader
        title="告警规则"
        description="为流量、设备数量与信号强度设定阈值，达到条件时通过邮件或企业微信通知。"
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
          },
          {
            label: '已启用',
            value: loading ? '…' : String(rules.filter((rule) => rule.enabled).length),
            detail: '当前生效的规则',
            icon: <Activity className="h-3.5 w-3.5" />,
          },
          {
            label: '已禁用',
            value: loading ? '…' : String(rules.filter((rule) => !rule.enabled).length),
            detail: '暂停监控的规则',
            icon: <BellOff className="h-3.5 w-3.5" />,
          },
          {
            label: '邮件通知',
            value: loading ? '…' : String(rules.filter((rule) => rule.notifyEmail).length),
            detail: '会发送邮件的规则数',
            icon: <Mail className="h-3.5 w-3.5" />,
          },
        ]}
      />

      {error ? <Callout tone="danger">{error}</Callout> : null}

      <DataTableCard
        colSpan={6}
        loading={loading}
        isEmpty={rules.length === 0}
        emptyMessage="暂无告警规则"
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
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell className="font-medium">{rule.name}</TableCell>
            <TableCell>{getMetricLabel(rule.metricType)}</TableCell>
            <TableCell>
              {getOperatorLabel(rule.operator)} {rule.threshold} {getMetricUnit(rule.metricType)}
            </TableCell>
            <TableCell>
              {rule.notifyEmail ? '邮件 ' : ''}
              {rule.notifyWechat ? '微信' : ''}
            </TableCell>
            <TableCell>
              <Badge variant={rule.enabled ? 'success' : 'secondary'}>
                {rule.enabled ? '启用' : '禁用'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => openEditModal(rule)}>编辑</Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => { void deleteRule(rule.id); }}
                >
                  删除
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </DataTableCard>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
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

            <div className="grid grid-cols-2 gap-4">
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
              <FieldGroup label="阈值（流量用 MB，设备用台，信号用 dBm）">
                <Input
                  type="number"
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
                value={String(formData.cooldownMinutes)}
                onChange={(event) => setFormData({
                  ...formData,
                  cooldownMinutes: Number(event.target.value),
                })}
              />
            </FieldGroup>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(value) => setFormData({ ...formData, enabled: value })}
                />
                <Label>启用规则</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.notifyEmail}
                  onCheckedChange={(value) => setFormData({ ...formData, notifyEmail: value })}
                />
                <Label>邮件通知</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.notifyWechat}
                  onCheckedChange={(value) => setFormData({ ...formData, notifyWechat: value })}
                />
                <Label>微信通知</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
            <Button onClick={() => { void saveRule(); }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
