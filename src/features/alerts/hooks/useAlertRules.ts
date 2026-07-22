'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import type { AlertRule } from '@/types';
import {
  createEmptyAlertRuleForm,
  filterAlertRules,
  getAlertRuleStats,
  toAlertRuleForm,
  type AlertRuleFormData,
  type AlertStatusFilter,
} from '../model';

export function useAlertRules() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<AlertRuleFormData>(createEmptyAlertRuleForm);
  const [updatingRuleId, setUpdatingRuleId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>('all');

  const fetchRules = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetchRules(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRules]);

  const openCreateDialog = useCallback(() => {
    setEditingRule(null);
    setFormData(createEmptyAlertRuleForm());
    setIsDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((rule: AlertRule) => {
    setEditingRule(rule);
    setFormData(toAlertRuleForm(rule));
    setIsDialogOpen(true);
  }, []);

  const saveRule = useCallback(async () => {
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
      setIsDialogOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存告警规则失败');
    }
  }, [editingRule, fetchRules, formData]);

  const deleteRule = useCallback(async (id: number) => {
    if (!window.confirm('确定要删除这条规则吗？')) return;
    setError('');
    try {
      await apiFetch(`/api/alerts/rules?id=${id}`, { method: 'DELETE' }, '删除告警规则失败');
      await fetchRules();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除告警规则失败');
    }
  }, [fetchRules]);

  const toggleRule = useCallback(async (rule: AlertRule, enabled: boolean) => {
    setUpdatingRuleId(rule.id);
    setError('');
    try {
      await apiFetch(
        '/api/alerts/rules',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...rule, enabled }),
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
  }, []);

  const visibleRules = useMemo(
    () => filterAlertRules(rules, query, statusFilter),
    [query, rules, statusFilter],
  );
  const stats = useMemo(() => getAlertRuleStats(rules), [rules]);

  return {
    rules,
    visibleRules,
    stats,
    loading,
    error,
    editingRule,
    isDialogOpen,
    formData,
    updatingRuleId,
    query,
    statusFilter,
    setError,
    setFormData,
    setIsDialogOpen,
    setQuery,
    setStatusFilter,
    openCreateDialog,
    openEditDialog,
    saveRule,
    deleteRule,
    toggleRule,
  };
}
