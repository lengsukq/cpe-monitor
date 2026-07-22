import test from 'node:test';
import assert from 'node:assert/strict';
import { computeClientProof, generateHexNonce } from '../src/lib/cpe-crypto.ts';
import { getCpeRequestTimeoutMs } from '../src/lib/cpe-http.ts';

test('CPE client proof is deterministic and fixed length', () => {
  const proof = computeClientProof(
    'password',
    '00112233445566778899aabbccddeeff',
    1000,
    'client-nonce',
    'server-nonce',
  );
  assert.equal(proof.length, 64);
  assert.equal(
    proof,
    computeClientProof('password', '00112233445566778899aabbccddeeff', 1000, 'client-nonce', 'server-nonce'),
  );
});

test('CPE nonce generation returns requested entropy length', () => {
  assert.match(generateHexNonce(16), /^[a-f0-9]{32}$/);
  assert.notEqual(generateHexNonce(16), generateHexNonce(16));
});

test('CPE request timeout validates environment configuration', () => {
  const previous = process.env.CPE_REQUEST_TIMEOUT_MS;
  process.env.CPE_REQUEST_TIMEOUT_MS = '25000';
  assert.equal(getCpeRequestTimeoutMs(), 25000);
  process.env.CPE_REQUEST_TIMEOUT_MS = '20';
  assert.equal(getCpeRequestTimeoutMs(), 15000);
  process.env.CPE_REQUEST_TIMEOUT_MS = 'invalid';
  assert.equal(getCpeRequestTimeoutMs(), 15000);
  if (previous === undefined) delete process.env.CPE_REQUEST_TIMEOUT_MS;
  else process.env.CPE_REQUEST_TIMEOUT_MS = previous;
});
