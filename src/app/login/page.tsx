'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, RadioTower, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Callout } from '@/components/Callout';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const reduce = useReducedMotion();

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
        setSuccess(true);
        window.setTimeout(() => router.push('/dashboard'), reduce ? 100 : 450);
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
      {/* Floating ambient orbs */}
      <motion.div
        className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
        animate={reduce ? undefined : { x: [0, 30, -10, 0], y: [0, -20, 15, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-info/10 blur-3xl"
        animate={reduce ? undefined : { x: [0, -25, 12, 0], y: [0, 18, -14, 0], scale: [1, 0.94, 1.06, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-brand/5 blur-3xl"
        animate={reduce ? undefined : { y: [0, 30, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={reduce ? undefined : { opacity: 0, scale: 0.92, y: 20 }}
        animate={
          success
            ? { opacity: 0, scale: 0.95, y: -10 }
            : { opacity: 1, scale: 1, y: 0 }
        }
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      >
        <Card className="border-white/80 bg-card/90 backdrop-blur-xl dark:border-border">
          <CardHeader className="space-y-3 text-center">
            <motion.span
              className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl bg-brand text-primary-foreground shadow-lg shadow-brand/20"
              animate={reduce ? undefined : { rotate: [0, -6, 6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
            >
              <RadioTower className="h-6 w-6" />
            </motion.span>
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
              <motion.div
                className="space-y-2"
                animate={error && !reduce ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Label htmlFor="password" className="transition-colors duration-200">管理员密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl"
                  required
                  autoComplete="current-password"
                />
              </motion.div>

              {error ? (
                <motion.div
                  initial={reduce ? undefined : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Callout tone="danger" title="登录失败">
                    {error}
                  </Callout>
                </motion.div>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl text-sm font-semibold"
                disabled={loading || success}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中…
                  </>
                ) : success ? (
                  '登录成功'
                ) : (
                  '登录'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
