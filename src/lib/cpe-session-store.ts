import crypto from 'crypto';
import { db, ensureDatabaseReady } from './db';

export interface PersistedCpeSession {
  sessionId: string;
  token: string;
  rsae: string;
  rsan: string;
  authenticatedAt: number;
  lastUsedAt: number;
}

interface CpeSessionRow {
  profile_key: string;
  cpe_url: string;
  cpe_username: string;
  encrypted_payload: string;
  updated_at: string | null;
}

const DEFAULT_PROFILE_KEY = 'default';
const DEFAULT_MAX_IDLE_HOURS = 24;
const ENCRYPTION_VERSION = 'v1';
let missingSecretWarningShown = false;

function getSessionSecret(): string | null {
  const secret = process.env.CPE_SESSION_SECRET || process.env.JWT_SECRET || '';
  if (secret) return secret;

  if (!missingSecretWarningShown) {
    missingSecretWarningShown = true;
    console.warn(
      'CPE session persistence is disabled because CPE_SESSION_SECRET and JWT_SECRET are not configured.',
    );
  }
  return null;
}

function getEncryptionKey(): Buffer | null {
  const secret = getSessionSecret();
  return secret ? crypto.createHash('sha256').update(secret).digest() : null;
}

function encryptPayload(payload: PersistedCpeSession): string | null {
  const key = getEncryptionKey();
  if (!key) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

function decryptPayload(value: string): PersistedCpeSession | null {
  const key = getEncryptionKey();
  if (!key) return null;

  try {
    const [version, ivValue, authTagValue, encryptedValue] = value.split('.');
    if (
      version !== ENCRYPTION_VERSION
      || !ivValue
      || !authTagValue
      || !encryptedValue
    ) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivValue, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(authTagValue, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
    const payload = JSON.parse(decrypted) as Partial<PersistedCpeSession>;

    if (
      typeof payload.sessionId !== 'string'
      || typeof payload.token !== 'string'
      || typeof payload.rsae !== 'string'
      || typeof payload.rsan !== 'string'
      || typeof payload.authenticatedAt !== 'number'
      || typeof payload.lastUsedAt !== 'number'
    ) {
      return null;
    }

    return payload as PersistedCpeSession;
  } catch (error) {
    console.warn('Failed to decrypt persisted CPE session; it will be discarded.', error);
    return null;
  }
}

function getMaxIdleMs(): number {
  const configuredHours = Number(
    process.env.CPE_SESSION_MAX_IDLE_HOURS || DEFAULT_MAX_IDLE_HOURS,
  );
  const hours = Number.isFinite(configuredHours) && configuredHours > 0
    ? configuredHours
    : DEFAULT_MAX_IDLE_HOURS;
  return hours * 60 * 60 * 1000;
}

export function loadCpeSession(
  cpeUrl: string,
  cpeUsername: string,
): PersistedCpeSession | null {
  ensureDatabaseReady();
  const row = db.prepare(
    `SELECT profile_key, cpe_url, cpe_username, encrypted_payload, updated_at
     FROM cpe_sessions
     WHERE profile_key = ?`,
  ).get(DEFAULT_PROFILE_KEY) as CpeSessionRow | undefined;

  if (!row) return null;
  if (row.cpe_url !== cpeUrl || row.cpe_username !== cpeUsername) {
    clearCpeSession();
    return null;
  }

  const session = decryptPayload(row.encrypted_payload);
  if (!session || Date.now() - session.lastUsedAt > getMaxIdleMs()) {
    clearCpeSession();
    return null;
  }

  return session;
}

export function saveCpeSession(
  cpeUrl: string,
  cpeUsername: string,
  session: PersistedCpeSession,
): void {
  ensureDatabaseReady();
  const encryptedPayload = encryptPayload(session);
  if (!encryptedPayload) return;

  db.prepare(
    `INSERT INTO cpe_sessions
      (profile_key, cpe_url, cpe_username, encrypted_payload, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(profile_key) DO UPDATE SET
       cpe_url = excluded.cpe_url,
       cpe_username = excluded.cpe_username,
       encrypted_payload = excluded.encrypted_payload,
       updated_at = datetime('now')`,
  ).run(
    DEFAULT_PROFILE_KEY,
    cpeUrl,
    cpeUsername,
    encryptedPayload,
  );
}

export function clearCpeSession(): void {
  ensureDatabaseReady();
  db.prepare('DELETE FROM cpe_sessions WHERE profile_key = ?')
    .run(DEFAULT_PROFILE_KEY);
}
