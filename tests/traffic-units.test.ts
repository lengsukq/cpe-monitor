import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bitsPerSecondBetweenTimestamps,
  bitsPerSecondFromByteDelta,
  bitsPerSecondToMegabits,
  bytesPerSecondToBitsPerSecond,
  bytesToMebibytes,
  computeCounterDelta,
} from '../src/lib/traffic-units.ts';

test('counter delta protects first samples and counter resets', () => {
  assert.equal(computeCounterDelta(1_000, null), 0);
  assert.equal(computeCounterDelta(1_000, 800), 200);
  assert.equal(computeCounterDelta(100, 800), 0);
  assert.equal(computeCounterDelta(null, 800), 0);
});

test('rate conversion keeps bytes and bits explicit', () => {
  assert.equal(bitsPerSecondFromByteDelta(1_000_000, 2), 4_000_000);
  assert.equal(bytesPerSecondToBitsPerSecond(1_000_000), 8_000_000);
  assert.equal(bitsPerSecondToMegabits(8_000_000), 8);
  assert.equal(bytesToMebibytes(1024 * 1024), 1);
});

test('timestamp rate calculation handles invalid windows', () => {
  assert.equal(bitsPerSecondBetweenTimestamps(1_000, 2_000, 1_000), 8_000);
  assert.equal(bitsPerSecondBetweenTimestamps(1_000, null, 1_000), 0);
  assert.equal(bitsPerSecondBetweenTimestamps(1_000, 1_000, 2_000), 0);
});
