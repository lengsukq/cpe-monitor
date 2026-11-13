import crypto from 'crypto';

export interface AppSession {
  userId: number;
  username: string;
  authSource?: 'jwt' | 'lightisle-proxy';
}

export interface HeaderLookup {
  get(name: string): string | null;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Verifies LightIsle gateway proxy headers when LIGHTISLE_PROXY_SECRET is configured.
 * Only grants session when the shared proxy secret matches and role is admin.
 */
export function resolveLightIsleProxySession(
  headerStore: HeaderLookup,
  expectedSecret = process.env.LIGHTISLE_PROXY_SECRET,
): AppSession | null {
  const secret = expectedSecret?.trim();
  if (!secret) return null;

  const providedSecret = headerStore.get('x-lightisle-proxy-secret')?.trim();
  if (!providedSecret || !timingSafeStringEqual(providedSecret, secret)) {
    return null;
  }

  const role = headerStore.get('x-lightisle-role')?.trim().toLowerCase();
  if (role !== 'admin') {
    return null;
  }

  const rawUserId = Number(headerStore.get('x-lightisle-user-id'));
  const userId = Number.isFinite(rawUserId) && rawUserId > 0 ? Math.floor(rawUserId) : 1;
  const username = headerStore.get('x-lightisle-username')?.trim() || 'admin';

  return {
    userId,
    username,
    authSource: 'lightisle-proxy',
  };
}
