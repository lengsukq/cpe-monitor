import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  getAppHour,
  parseAppDateKeyRange,
  toSqliteTimestamp,
} from '../src/lib/date-time.ts';
import {
  prepareEmailConfigForStorage,
  prepareWechatConfigForStorage,
  readEmailConfig,
  toPublicEmailConfig,
  toPublicWechatConfig,
} from '../src/lib/notification-config.ts';
import { withBasePath } from '../src/lib/base-path.ts';
import { runDatabaseMigrations, type SqliteDatabase } from '../src/lib/db.ts';

test('parseAppDateKeyRange converts Shanghai calendar days to inclusive UTC window', () => {
  const range = parseAppDateKeyRange('2026-11-12', '2026-11-13');
  assert.ok(range);
  assert.equal(toSqliteTimestamp(range.start), '2026-11-11 16:00:00');
  assert.equal(toSqliteTimestamp(range.end), '2026-11-13 15:59:59');

  assert.equal(parseAppDateKeyRange('2026-11-14', '2026-11-13'), null);
  assert.equal(parseAppDateKeyRange('bad-date', '2026-11-13'), null);
});

test('getAppHour returns 0 rather than 24 at Shanghai midnight', () => {
  assert.equal(getAppHour('2026-11-12 16:00:00'), 0);
  assert.equal(getAppHour('2026-11-12 16:30:00'), 0);
});

test('daily_reports v6 schema supports idempotent (report_date, period_type) upserts', () => {
  const database = new Database(':memory:');
  try {
    const version = runDatabaseMigrations(database as unknown as SqliteDatabase);
    assert.equal(version, 6);

    const stmt = database.prepare(
      `INSERT INTO daily_reports (
         report_date, period_type, total_upload, total_download,
         peak_hour, top_devices, avg_signal, uptime_percent, network_quality
       ) VALUES (?, 'daily', ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(report_date, period_type) DO UPDATE SET
         total_upload = excluded.total_upload,
         total_download = excluded.total_download,
         created_at = datetime('now')`,
    );

    stmt.run('2026-11-13', 100, 200, 12, '[]', -80, 99.5, '优秀');
    stmt.run('2026-11-13', 150, 300, 12, '[]', -80, 99.5, '优秀');

    const row = database.prepare(
      "SELECT total_upload, total_download FROM daily_reports WHERE report_date = ? AND period_type = 'daily'",
    ).get('2026-11-13') as { total_upload: number; total_download: number };

    assert.equal(row.total_upload, 150);
    assert.equal(row.total_download, 300);
  } finally {
    database.close();
  }
});

test('notification config gracefully handles secrets encrypted under a rotated key', () => {
  const previousSecret = process.env.CPE_CONFIG_SECRET;
  try {
    process.env.CPE_CONFIG_SECRET = 'old-secret-before-migration-123456';
    const storedEmail = prepareEmailConfigForStorage({
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpUser: 'user@example.com',
      smtpPass: 'old-smtp-pass',
      from: 'user@example.com',
      to: 'dest@example.com',
    });
    const storedWechat = prepareWechatConfigForStorage({
      webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=old',
    });

    process.env.CPE_CONFIG_SECRET = 'new-secret-after-migration-abcdef';

    const publicEmail = toPublicEmailConfig(storedEmail);
    assert.equal(publicEmail.smtpHost, 'smtp.example.com');
    assert.equal(publicEmail.smtpPasswordSet, false);

    const publicWechat = toPublicWechatConfig(storedWechat);
    assert.equal(publicWechat.webhookConfigured, false);

    const overwritten = prepareEmailConfigForStorage({
      smtpHost: 'smtp.example.com',
      smtpPort: 465,
      smtpUser: 'user@example.com',
      smtpPass: 'new-smtp-pass',
      from: 'user@example.com',
      to: 'dest@example.com',
    }, storedEmail);
    assert.equal(readEmailConfig(overwritten).smtpPass, 'new-smtp-pass');
  } finally {
    if (previousSecret === undefined) {
      delete process.env.CPE_CONFIG_SECRET;
    } else {
      process.env.CPE_CONFIG_SECRET = previousSecret;
    }
  }
});

test('withBasePath prefixes PWA and API routes without double-prefixing', () => {
  assert.equal(withBasePath('/sw.js', '/apps/cpe-monitor'), '/apps/cpe-monitor/sw.js');
  assert.equal(withBasePath('/manifest.json', '/apps/cpe-monitor'), '/apps/cpe-monitor/manifest.json');
  assert.equal(withBasePath('/apps/cpe-monitor/sw.js', '/apps/cpe-monitor'), '/apps/cpe-monitor/sw.js');
});
