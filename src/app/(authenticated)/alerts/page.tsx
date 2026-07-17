'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AlertRule {
  id: number;
  name: string;
  metricType: string;
  threshold: number;
  operator: string;
  enabled: boolean;
  notifyEmail: boolean;
  notifyWechat: boolean;
  cooldownMinutes: number;
}

const metricTypes = [
  { value: 'traffic_down', label: '下载流量', unit: 'MB' },
  { value: 'traffic_up', label: '上传流量', unit: 'MB' },
  { value: 'devices', label: '设备数量', unit: '台' },
  { value: 'signal', label: '信号强度', unit: 'dBm' },
];

const operators = [
  { value: '>', label: '大于' },
  { value: '<', label: '小于' },
  { value: '>=', label: '大于等于' },
  { value: '<=', label: '小于等于' },
];

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    metricType: 'traffic_down',
    threshold: 0,
    operator: '>',
    enabled: true,
    notifyEmail: true,
    notifyWechat: true,
    cooldownMinutes: 30,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/alerts/rules');
      const data = await res.json();
      setRules(data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      metricType: 'traffic_down',
      threshold: 0,
      operator: '>',
      enabled: true,
      notifyEmail: true,
      notifyWechat: true,
      cooldownMinutes: 30,
    });
    setIsOpen(true);
  };

  const openEditModal = (rule: AlertRule) => {
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
  };

  const saveRule = async () => {
    try {
      const method = editingRule ? 'PUT' : 'POST';

      const res = await fetch('/api/alerts/rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule ? { id: editingRule.id, ...formData } : formData),
      });

      if (res.ok) {
        await fetchRules();
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const deleteRule = async (id: number) => {
    if (!confirm('确定要删除这条规则吗？')) return;

    try {
      const res = await fetch(`/api/alerts/rules?id=${id}`, { method: 'DELETE' });
      if (res.ok) await fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const getMetricLabel = (type: string) => metricTypes.find((m) => m.value === type)?.label || type;
  const getMetricUnit = (type: string) => metricTypes.find((m) => m.value === type)?.unit || '';
  const getOperatorLabel = (op: string) => operators.find((o) => o.value === op)?.label || op;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">告警规则</h1>
        <Button onClick={openCreateModal}>新建规则</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>监控指标</TableHead>
                <TableHead>条件</TableHead>
                <TableHead>通知方式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">暂无告警规则</TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>{getMetricLabel(rule.metricType)}</TableCell>
                    <TableCell>{getOperatorLabel(rule.operator)} {rule.threshold} {getMetricUnit(rule.metricType)}</TableCell>
                    <TableCell>
                      {rule.notifyEmail && '邮件 '}
                      {rule.notifyWechat && '微信'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(rule)}>编辑</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteRule(rule.id)}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? '编辑规则' : '新建规则'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>监控指标</Label>
              <Select value={formData.metricType} onValueChange={(val) => setFormData({ ...formData, metricType: val ?? 'traffic_down' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {metricTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>运算符</Label>
                <Select value={formData.operator} onValueChange={(val) => setFormData({ ...formData, operator: val ?? '>' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>阈值（流量用 MB，设备用台，信号用 dBm）</Label>
                <Input type="number" value={String(formData.threshold)} onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>静默期 (分钟)</Label>
              <Input type="number" value={String(formData.cooldownMinutes)} onChange={(e) => setFormData({ ...formData, cooldownMinutes: Number(e.target.value) })} />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={formData.enabled} onCheckedChange={(val) => setFormData({ ...formData, enabled: val })} />
                <Label>启用规则</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.notifyEmail} onCheckedChange={(val) => setFormData({ ...formData, notifyEmail: val })} />
                <Label>邮件通知</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.notifyWechat} onCheckedChange={(val) => setFormData({ ...formData, notifyWechat: val })} />
                <Label>微信通知</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>取消</Button>
            <Button onClick={saveRule}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
