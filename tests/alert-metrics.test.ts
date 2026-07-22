import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALERT_METRIC_DEFINITIONS,
  ALERT_METRIC_TYPES,
  getAlertMetricDefinition,
  getAlertSeverity,
  isAlertMetricType,
  isAlertOperator,
} from '../src/lib/alert-metrics.ts';

test('alert metric catalog contains every supported metric exactly once', () => {
  assert.equal(new Set(ALERT_METRIC_TYPES).size, ALERT_METRIC_TYPES.length);
  for (const metric of ALERT_METRIC_TYPES) {
    const definition = getAlertMetricDefinition(metric);
    assert.equal(definition, ALERT_METRIC_DEFINITIONS[metric]);
    assert.ok(definition.label.length > 0);
    assert.ok(definition.unit.length > 0);
    assert.ok(definition.guidance.length > 0);
  }
});

test('metric and operator guards reject unsupported values', () => {
  assert.equal(isAlertMetricType('rsrp'), true);
  assert.equal(isAlertMetricType('unknown_metric'), false);
  assert.equal(isAlertOperator('>='), true);
  assert.equal(isAlertOperator('='), false);
});

test('alert severity uses shared domain thresholds', () => {
  assert.equal(getAlertSeverity('collection_failures', 3), 'critical');
  assert.equal(getAlertSeverity('rsrp', -106), 'critical');
  assert.equal(getAlertSeverity('rsrp', -95), 'warning');
  assert.equal(getAlertSeverity('devices', 20), 'info');
});
