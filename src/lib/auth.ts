import { SignJWT, jwtVerify } from 'jose';
import { compare } from 'bcryptjs';
import { cookies } from 'next/headers';

function resolveJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required. Set it in the environment (see .env.example).');
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = resolveJwtSecret();

/**
 * Resolves the admin password hash from environment.
 * Supports ADMIN_PASSWORD_HASH (bcrypt hash, recommended) or
 * legacy ADMIN_PASSWORD (plaintext, hashed at runtime for comparison).
 */
function resolveAdminPasswordHash(): string {
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (hash) return hash;
  // Legacy fallback: plaintext password in env (not recommended for production)
  const plain = process.env.ADMIN_PASSWORD?.trim();
  if (plain) return plain;
  throw new Error(
    'ADMIN_PASSWORD_HASH is required. Generate one with: npx tsx scripts/hash-password.ts <password>',
  );
}

/**
 * Verify the input password against the environment-configured admin credential.
 * If ADMIN_PASSWORD_HASH is set (starts with $2), uses bcrypt compare.
 * If only legacy ADMIN_PASSWORD is set, does a direct string comparison.
 */
export async function verifyAdminPassword(inputPassword: string): Promise<boolean> {
  const stored = resolveAdminPasswordHash();
  if (stored.startsWith('$2')) {
    return compare(inputPassword, stored);
  }
  // Legacy plaintext comparison
  return inputPassword === stored;
}

export async function createToken(payload: { userId: number; username: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: number; username: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
