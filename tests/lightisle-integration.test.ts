import test from 'node:test';
import assert from 'node:assert/strict';
import { withBasePath } from '../src/lib/base-path.ts';
import { resolveLightIsleProxySession } from '../src/lib/proxy-auth.ts';
import {
  isDailyReportDue,
  isIntervalTaskDue,
  isMonthlyReportDue,
  isWeeklyReportDue,
} from '../src/lib/cron-schedule-eval.ts';

function headersFrom(record: Record<string, string | undefined>) {
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(record)) {
    if (v !== undefined) map.set(k.toLowerCase(), v);
  }
  return {
    get(name: string) {
      return map.get(name.toLowerCase()) ?? null;
    },
  };
}

test('withBasePath prefixes root-relative URLs once and leaves external URLs untouched', () => {
  assert.equal(withBasePath('/api/auth/me', '/apps/cpe-monitor'), '/apps/cpe-monitor/api/auth/me');
  assert.equal(withBasePath('/apps/cpe-monitor/api/auth/me', '/apps/cpe-monitor'), '/apps/cpe-monitor/api/auth/me');
  assert.equal(withBasePath('/api/auth/me', ''), '/api/auth/me');
  assert.equal(withBasePath('https://example.com/test', '/apps/cpe-monitor'), 'https://example.com/test');
});

test('resolveLightIsleProxySession grants admin session only when proxy secret and role match', () => {
  const valid = resolveLightIsleProxySession(
    headersFrom({
      'x-lightisle-proxy-secret': 'secret-123',
      'x-lightisle-role': 'admin',
      'x-lightisle-user-id': '7',
      'x-lightisle-username': 'queensu',
    }),
    'secret-123',
  );
  assert.deepEqual(valid, {
    userId: 7,
    username: 'queensu',
    authSource: 'lightisle-proxy',
  });

  assert.equal(
    resolveLightIsleProxySession(
      headersFrom({ 'x-lightisle-proxy-secret': 'wrong', 'x-lightisle-role': 'admin' }),
      'secret-123',
    ),
    null,
  );
  assert.equal(
    resolveLightIsleProxySession(
      headersFrom({ 'x-lightisle-proxy-secret': 'secret-123', 'x-lightisle-role': 'member' }),
      'secret-123',
    ),
    null,
  );
  assert.equal(
    resolveLightIsleProxySession(
      headersFrom({ 'x-lightisle-proxy-secret': 'secret-123', 'x-lightisle-role': 'admin' }),
      '',
    ),
    null,
  );
});

test('cron schedule evaluators check interval tolerance and Shanghai report windows', () => {
  const now = new Date('2026-11-15T14:35:00Z'); // 2026-11-15 22:35 Asia/Shanghai (Sunday)
  assert.equal(
    isIntervalTaskDue({
      enabled: true,
      intervalMinutes: 15,
      lastRunAt: new Date(now.getTime() - 14 * 60_000 - 10_000).toISOString(),
      now,
    }),
    true,
  );
  assert.equal(
    isIntervalTaskDue({
      enabled: true,
      intervalMinutes: 15,
      lastRunAt: new Date(now.getTime() - 10 * 60_000).toISOString(),
      now,
    }),
    false,
  );
  assert.equal(
    isIntervalTaskDue({
      enabled: false,
      intervalMinutes: 5,
      lastRunAt: null,
      now,
    }),
    false,
  );

  assert.equal(isDailyReportDue(true, false, now), true);
  assert.equal(isDailyReportDue(true, true, now), false);
  assert.equal(isWeeklyReportDue(true, false, now), true);
  assert.equal(isMonthlyReportDue(true, false, new Date('2026-11-30T16:35:00Z')), true); // Dec 1 00:35 +08:00
});
