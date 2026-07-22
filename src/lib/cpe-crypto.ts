import crypto from 'crypto';
import forge from 'node-forge';

export interface RsaPublicParameters {
  n: string;
  e: string;
}

export function generateHexNonce(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('hex');
}

export function computeClientProof(
  password: string,
  saltHex: string,
  iterations: number,
  clientNonce: string,
  serverNonce: string,
): string {
  const saltBytes = Buffer.from(saltHex, 'hex');
  const saltedPassword = crypto.pbkdf2Sync(
    Buffer.from(password, 'utf-8'),
    saltBytes,
    iterations,
    32,
    'sha256',
  );
  const clientKey = crypto.createHmac('sha256', 'Client Key').update(saltedPassword).digest();
  const storedKey = crypto.createHash('sha256').update(clientKey).digest();
  const authMessage = `${clientNonce},${serverNonce},${serverNonce}`;
  const signature = crypto.createHmac('sha256', authMessage).update(storedKey).digest();
  const proof = Buffer.alloc(clientKey.length);
  for (let index = 0; index < clientKey.length; index += 1) {
    proof[index] = clientKey[index] ^ signature[index];
  }
  return proof.toString('hex');
}

export function rsaEncryptValue(parameters: RsaPublicParameters, value: string): string {
  const pem = forge.pki.publicKeyToPem(parameters);
  const publicKey = forge.pki.publicKeyFromPem(pem);
  const base64 = forge.util.encode64(forge.util.encodeUtf8(value));
  return forge.util.bytesToHex(
    publicKey.encrypt(forge.util.encodeUtf8(base64), 'RSA-OAEP'),
  );
}

export function decryptSmsEnvelope(input: {
  encryptedHex: string;
  expectedHash: string;
  iterations: number;
  firstNonce: string;
  secondNonce: string;
}): string {
  const firstKey = crypto.pbkdf2Sync(
    Buffer.from(input.firstNonce.slice(0, 32), 'utf8'),
    Buffer.from(input.firstNonce.slice(32, 64), 'hex'),
    input.iterations,
    32,
    'sha256',
  );
  const secondKey = crypto.pbkdf2Sync(
    Buffer.from(input.secondNonce.slice(0, 32), 'utf8'),
    Buffer.from(input.secondNonce.slice(32, 64), 'hex'),
    input.iterations,
    32,
    'sha256',
  );
  const actualHash = crypto
    .createHmac('sha256', secondKey)
    .update(Buffer.from(input.encryptedHex, 'hex'))
    .digest('hex');
  if (actualHash !== input.expectedHash) {
    throw new Error('CPE SMS response integrity check failed');
  }
  const decipher = crypto.createDecipheriv(
    'aes-128-cbc',
    firstKey.subarray(0, 16),
    firstKey.subarray(16, 32),
  );
  return Buffer.concat([
    decipher.update(Buffer.from(input.encryptedHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
