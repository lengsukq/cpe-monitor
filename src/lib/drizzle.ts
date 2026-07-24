/**
 * Drizzle ORM instance wrapping the existing better-sqlite3 connection.
 * Import `drizzleDb` for type-safe queries; the underlying connection
 * is still managed by `src/lib/db.ts` (WAL mode, lazy init).
 */
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type Database from 'better-sqlite3';
import { getDb } from './db';
import * as schema from './schema';

let instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDrizzleDb() {
  if (!instance) {
    const sqlite = getDb() as unknown as Database.Database;
    instance = drizzle(sqlite, { schema });
  }
  return instance;
}

/** Convenience alias for direct import. */
export const drizzleDb = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const db = getDrizzleDb();
    const value = Reflect.get(db, prop);
    return typeof value === 'function' ? value.bind(db) : value;
  },
});
