import { db, ensureDatabaseReady } from '@/lib/db';

export interface UserRecord {
  id: number;
  username: string;
  passwordHash: string;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
}

function mapUser(row: UserRow | undefined): UserRecord | null {
  return row ? { id: row.id, username: row.username, passwordHash: row.password_hash } : null;
}

export function findUserByUsername(username: string): UserRecord | null {
  ensureDatabaseReady();
  return mapUser(
    db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username) as UserRow | undefined,
  );
}

export function findUserById(id: number): UserRecord | null {
  ensureDatabaseReady();
  return mapUser(
    db.prepare('SELECT id, username, password_hash FROM users WHERE id = ?').get(id) as UserRow | undefined,
  );
}

export function createUser(username: string, passwordHash: string): UserRecord {
  ensureDatabaseReady();
  const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
  const user = findUserById(Number(result.lastInsertRowid));
  if (!user) throw new Error('Failed to read created user');
  return user;
}

export function updateUserPassword(id: number, passwordHash: string): void {
  ensureDatabaseReady();
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}
