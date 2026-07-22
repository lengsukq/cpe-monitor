import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAppDateKey,
  getAppDayRange,
  getAppHour,
  parseDateTime,
  parseTimestampMs,
  toSqliteTimestamp,
} from '../src/lib/date-time.ts';

test('parses SQLite UTC timestamps consistently', () => {
  const parsed = parseDateTime('2026-07-22 10:00:00');
  assert.equal(parsed?.toISOString(), '2026-07-22T10:00:00.000Z');
  assert.equal(parseTimestampMs('2026-07-22 10:00:00'), Date.parse('2026-07-22T10:00:00Z'));
});

test('preserves ISO timestamps with an explicit offset', () => {
  const parsed = parseDateTime('2026-07-22T18:00:00+08:00');
  assert.equal(parsed?.toISOString(), '2026-07-22T10:00:00.000Z');
});

test('creates stable Shanghai calendar boundaries', () => {
  const reference = new Date('2026-07-22T15:59:59Z');
  assert.equal(getAppDateKey(reference), '2026-07-22');
  const nextMinute = new Date('2026-07-22T16:00:00Z');
  const range = getAppDayRange(nextMinute);
  assert.equal(range.dateKey, '2026-07-23');
  assert.equal(range.start.toISOString(), '2026-07-22T16:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-07-23T16:00:00.000Z');
  assert.equal(toSqliteTimestamp(range.start), '2026-07-22 16:00:00');
});

test('returns the Shanghai hour for SQLite timestamps', () => {
  assert.equal(getAppHour('2026-07-22 10:00:00'), 18);
  assert.equal(getAppHour('invalid'), null);
});
