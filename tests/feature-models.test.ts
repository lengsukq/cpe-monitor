import test from 'node:test';
import assert from 'node:assert/strict';
import type { AlertRule, DailyReport } from '../src/types/index.ts';
import {
  filterAlertRules,
  getAlertRuleStats,
} from '../src/features/alerts/model.ts';
import {
  filterDailyReports,
  getReportOverviewStats,
  getReportQualityOptions,
  getReportQualityVariant,
} from '../src/features/reports/model.ts';

const alertRules: AlertRule[] = [
  {
    id: 1,
    name: '下载速率过高',
    metricType: 'download_rate',
    threshold: 100,
    operator: '>',
    enabled: true,
    notifyEmail: true,
    notifyWechat: false,
    cooldownMinutes: 30,
    createdAt: null,
  },
  {
    id: 2,
    name: '信号过低',
    metricType: 'rsrp',
    threshold: -110,
    operator: '<',
    enabled: false,
    notifyEmail: false,
    notifyWechat: true,
    cooldownMinutes: 60,
    createdAt: null,
  },
];

const reports: DailyReport[] = [
  {
    id: 2,
    reportDate: '2026-07-22',
    totalUpload: 20,
    totalDownload: 100,
    peakHour: 20,
    topDevices: [],
    avgSignal: -90,
    uptimePercent: 95,
    networkQuality: '优秀',
    sentAt: null,
    createdAt: null,
  },
  {
    id: 1,
    reportDate: '2026-07-21',
    totalUpload: 10,
    totalDownload: 50,
    peakHour: 19,
    topDevices: [],
    avgSignal: -105,
    uptimePercent: 80,
    networkQuality: '一般',
    sentAt: null,
    createdAt: null,
  },
];

test('alert rule filters combine text and enabled state', () => {
  assert.deepEqual(filterAlertRules(alertRules, '信号', 'all').map((rule) => rule.id), [2]);
  assert.deepEqual(filterAlertRules(alertRules, '', 'enabled').map((rule) => rule.id), [1]);
  assert.deepEqual(filterAlertRules(alertRules, 'dBm', 'disabled').map((rule) => rule.id), [2]);
});

test('alert overview stats share one source of truth', () => {
  const stats = getAlertRuleStats(alertRules);
  assert.equal(stats.enabledCount, 1);
  assert.equal(stats.disabledCount, 1);
  assert.equal(stats.emailCount, 1);
  assert.equal(stats.wechatCount, 1);
  assert.equal(stats.metricDistribution.reduce((total, value) => total + value, 0), 2);
});

test('report filters and overview trends remain deterministic', () => {
  assert.deepEqual(filterDailyReports(reports, '2026-07-21', 'all').map((report) => report.id), [1]);
  assert.deepEqual(filterDailyReports(reports, '', '优秀').map((report) => report.id), [2]);
  assert.deepEqual(getReportQualityOptions(reports), ['优秀', '一般']);
  assert.equal(getReportQualityVariant('优秀'), 'success');
  assert.equal(getReportQualityVariant('未知'), 'secondary');

  const overview = getReportOverviewStats(reports);
  assert.equal(overview.latestReport?.id, 2);
  assert.deepEqual(overview.trafficTrend, [60, 120]);
  assert.deepEqual(overview.downloadTrend, [50, 100]);
  assert.deepEqual(overview.signalTrend, [-105, -90]);
});
