import { initializeDatabase } from './db';
import { clearCpeSession } from './cpe-session-store';
import { CpeClient } from './cpe-client-core';
import { getCpeCredentials } from './settings-store';

export { CpeClient } from './cpe-client-core';
export type { CpeDevice, CpeSmsMessage, CpeTrafficData } from '@/types/cpe';

let cachedClient: CpeClient | null = null;

export function getCpeClient(): CpeClient | null {
  return cachedClient;
}

export function resetCpeClient(): void {
  cachedClient = null;
  clearCpeSession();
}

export function initCpeClient(url: string, username: string, password: string): CpeClient {
  if (!cachedClient || !cachedClient.matchesCredentials(url, username, password)) {
    if (cachedClient) clearCpeSession();
    cachedClient = new CpeClient(url, username, password);
  }
  return cachedClient;
}

export function getOrCreateCpeClient(): CpeClient {
  if (cachedClient) return cachedClient;
  try {
    initializeDatabase();
  } catch (error) {
    console.error('Failed to initialize database before CPE client create', error);
  }
  const credentials = getCpeCredentials();
  cachedClient = new CpeClient(credentials.url, credentials.username, credentials.password);
  return cachedClient;
}
