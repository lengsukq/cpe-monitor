'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RadioTower, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Callout } from '@/components/Callout';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || '登录失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-info/10 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      <Card className="page-enter relative z-10 w-full max-w-md border-white/80 bg-card/90 backdrop-blur-xl dark:border-border">
        <CardHeader className="space-y-3 text-center">
          <span className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-lg shadow-brand/20">
            <RadioTower className="h-6 w-6" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand/70">CPE monitor</p>
          <CardTitle className="bg-gradient-to-r from-brand to-info bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            CPEye
          </CardTitle>
          <CardDescription className="text-sm leading-6">
            5G CPE 流量监控 · 告警与每日报告
          </CardDescription>
          <div className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
            <ShieldCheck className="h-3.5 w-3.5" />
            本地管理控制台
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">管理员密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus-ring h-10 rounded-xl"
                required
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <Callout tone="danger" title="登录失败">
                {error}
              </Callout>
            ) : null}

            <Button type="submit" className="h-10 w-full rounded-xl" disabled={loading}>
              {loading ? '登录中…' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
