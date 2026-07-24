import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { db, ensureDatabaseReady } from '@/lib/db';
import { writeSystemLog } from '@/lib/system-log';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'cpe-monitor.db');

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabaseReady();

  // Checkpoint WAL to ensure all data is in the main db file
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // Ignore if WAL mode is not enabled
  }

  // Read the database file
  if (!fs.existsSync(DB_PATH)) {
    throw new Error('数据库文件不存在');
  }

  const dbBuffer = fs.readFileSync(DB_PATH);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `cpe-monitor-backup-${timestamp}.db`;

  writeSystemLog('info', `数据库备份已下载: ${filename}`);

  return new Response(dbBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(dbBuffer.length),
    },
  });
}, '备份数据库失败');

export const POST = withApiHandler(async () => {
  await requireSession();
  ensureDatabaseReady();

  // Create a backup before any operation
  const backupDir = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(backupDir, `auto-backup-${timestamp}.db`);

  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // Ignore
  }

  fs.copyFileSync(DB_PATH, backupPath);
  writeSystemLog('info', `自动备份已创建: ${backupPath}`);

  return jsonOk({
    success: true,
    backupPath,
    message: '备份已创建',
  });
}, '创建备份失败');
