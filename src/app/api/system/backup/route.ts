import { requireSession, withApiHandler, jsonOk } from '@/lib/api-route';
import { db, ensureDatabaseReady, getDatabasePath } from '@/lib/db';
import { writeSystemLog } from '@/lib/system-log';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const GET = withApiHandler(async () => {
  await requireSession();
  ensureDatabaseReady();
  const dbPath = getDatabasePath();

  // Checkpoint WAL to ensure all data is in the main db file
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    // Ignore if WAL mode is not enabled
  }

  // Read the database file
  if (!fs.existsSync(dbPath)) {
    throw new Error('数据库文件不存在');
  }

  const dbBuffer = fs.readFileSync(dbPath);
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
  const dbPath = getDatabasePath();

  // Create a backup before any operation
  const backupDir = path.join(path.dirname(dbPath), 'backups');
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

  fs.copyFileSync(dbPath, backupPath);
  writeSystemLog('info', `自动备份已创建: ${backupPath}`);

  return jsonOk({
    success: true,
    backupPath,
    message: '备份已创建',
  });
}, '创建备份失败');
