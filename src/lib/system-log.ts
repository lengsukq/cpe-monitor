/**
 * Utility for writing structured entries to the system_logs table.
 * Used across background services for observability.
 */
import { db, ensureDatabaseReady } from './db';

export type SystemLogLevel = 'info' | 'warn' | 'error';

export function writeSystemLog(level: SystemLogLevel, message: string): void {
  try {
    ensureDatabaseReady();
    db.prepare('INSERT INTO system_logs (level, message) VALUES (?, ?)').run(level, message);
  } catch (error) {
    // Never throw from logging — just print to console
    console.error('Failed to write system log:', error);
  }
}
