'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const [cpeConfig, setCpeConfig] = useState({
    cpeUrl: 'http://192.168.31.1',
    cpeUsername: 'admin',
    cpePassword: '',
  });

  const [emailConfig, setEmailConfig] = useState({
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    from: '',
    to: '',
  });

  const [wechatConfig, setWechatConfig] = useState({
    webhookUrl: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: string } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<{ updateState?: string; message?: string; error?: string } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  async function fetchConfigs() {
    try {
      const [cpeRes, notifRes] = await Promise.all([
        fetch('/api/settings/cpe'),
        fetch('/api/settings/notification'),
      ]);

      const cpeData = await cpeRes.json();
      if (cpeData.cpe_url) {
        setCpeConfig({
          cpeUrl: cpeData.cpe_url,
          cpeUsername: cpeData.cpe_username || 'admin',
          cpePassword: '',
        });
      }

      const notifData = await notifRes.json();
      for (const config of notifData) {
        if (config.type === 'email') {
          setEmailConfig(JSON.parse(config.config));
        } else if (config.type === 'wechat') {
          setWechatConfig(JSON.parse(config.config));
        }
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error);
    }
  }

  async function saveCpeConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/cpe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpeConfig),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'CPE 配置已保存' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function testCpeConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/cpe/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cpeConfig),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: '测试请求失败' });
    } finally {
      setTesting(false);
    }
  }

  async function fetchUpdateStatus() {
    try {
      const res = await fetch('/api/system/update');
      const data = await res.json();
      if (res.ok) setUpdateStatus(data);
      else setUpdateStatus({ error: data.error || '无法获取升级状态' });
    } catch {
      setUpdateStatus({ error: '无法获取升级状态' });
    }
  }

  async function checkSystemUpdate() {
    setCheckingUpdate(true);
    try {
      const res = await fetch('/api/system/update', { method: 'POST' });
      const data = await res.json();
      if (res.ok) setUpdateStatus(data);
      else setUpdateStatus({ error: data.error || '检查更新失败' });
    } catch {
      setUpdateStatus({ error: '检查更新请求失败' });
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function saveEmailConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', config: emailConfig, enabled: true }),
      });

      if (res.ok) setMessage({ type: 'success', text: '邮件配置已保存' });
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function saveWechatConfig() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'wechat', config: wechatConfig, enabled: true }),
      });

      if (res.ok) setMessage({ type: 'success', text: '企业微信配置已保存' });
    } catch {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setLoading(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: '密码已修改' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || '修改失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '修改失败' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConfigs();
    fetchUpdateStatus();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">系统设置</h1>

      {message.text && (
        <div className={`rounded-2xl border p-4 ${message.type === 'success' ? 'border-green-500/20 bg-green-500/10 text-green-800 dark:text-green-300' : 'border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* CPE 配置 */}
      <Card>
        <CardHeader><CardTitle>CPE 设备配置</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>CPE 地址</Label>
            <Input value={cpeConfig.cpeUrl} onChange={(e) => setCpeConfig({ ...cpeConfig, cpeUrl: e.target.value })} placeholder="http://192.168.31.1" />
          </div>
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input value={cpeConfig.cpeUsername} onChange={(e) => setCpeConfig({ ...cpeConfig, cpeUsername: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>密码</Label>
            <Input type="password" value={cpeConfig.cpePassword} onChange={(e) => setCpeConfig({ ...cpeConfig, cpePassword: e.target.value })} placeholder="留空则不修改" />
          </div>
          <div className="flex gap-3">
            <Button onClick={saveCpeConfig} disabled={loading}>保存 CPE 配置</Button>
            <Button variant="outline" onClick={testCpeConnection} disabled={testing}>{testing ? '测试中...' : '测试连接'}</Button>
          </div>

          {testResult && (
            <div className={`rounded-2xl border p-4 ${testResult.success ? 'border-green-500/20 bg-green-500/10 text-green-800 dark:text-green-300' : 'border-red-500/20 bg-red-500/10 text-red-800 dark:text-red-300'}`}>
              <div className="font-semibold">{testResult.message}</div>
              {testResult.latency && <div className="text-sm mt-1">响应时间: {testResult.latency}</div>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 系统更新 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>系统更新</CardTitle>
            <Badge variant={updateStatus?.error ? 'secondary' : 'outline'}>{getUpdateStateLabel(updateStatus?.updateState)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
            {updateStatus?.error || updateStatus?.message || '仅在点击按钮时触发设备在线升级检查，不会自动执行写操作。'}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchUpdateStatus}>刷新升级状态</Button>
            <Button onClick={checkSystemUpdate} disabled={checkingUpdate}>{checkingUpdate ? '检查中...' : '检查更新'}</Button>
          </div>
        </CardContent>
      </Card>

      {/* 邮件配置 */}
      <Card>
        <CardHeader><CardTitle>邮件通知配置</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP 服务器</Label>
              <Input value={emailConfig.smtpHost} onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })} placeholder="smtp.gmail.com" />
            </div>
            <div className="space-y-2">
              <Label>端口</Label>
              <Input value={emailConfig.smtpPort} onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })} placeholder="587" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>SMTP 用户名</Label>
              <Input value={emailConfig.smtpUser} onChange={(e) => setEmailConfig({ ...emailConfig, smtpUser: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>SMTP 密码</Label>
              <Input type="password" value={emailConfig.smtpPass} onChange={(e) => setEmailConfig({ ...emailConfig, smtpPass: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>发件人</Label>
            <Input value={emailConfig.from} onChange={(e) => setEmailConfig({ ...emailConfig, from: e.target.value })} placeholder="noreply@example.com" />
          </div>
          <div className="space-y-2">
            <Label>收件人 (每行一个邮箱)</Label>
            <Textarea value={emailConfig.to} onChange={(e) => setEmailConfig({ ...emailConfig, to: e.target.value })} placeholder="user1@example.com&#10;user2@example.com" />
          </div>
          <Button onClick={saveEmailConfig} disabled={loading}>保存邮件配置</Button>
        </CardContent>
      </Card>

      {/* 企业微信配置 */}
      <Card>
        <CardHeader><CardTitle>企业微信通知配置</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input value={wechatConfig.webhookUrl} onChange={(e) => setWechatConfig({ ...wechatConfig, webhookUrl: e.target.value })} placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." />
          </div>
          <Button onClick={saveWechatConfig} disabled={loading}>保存企业微信配置</Button>
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader><CardTitle>修改密码</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>当前密码</Label>
            <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>新密码</Label>
            <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>确认新密码</Label>
            <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
          </div>
          <Button onClick={changePassword} disabled={loading}>修改密码</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function getUpdateStateLabel(state?: string) {
  const map: Record<string, string> = {
    '16': '空闲',
    '17': '检查中',
    '32': '有可用更新',
    unknown: '未知',
  };
  return map[state || 'unknown'] || `状态 ${state}`;
}
