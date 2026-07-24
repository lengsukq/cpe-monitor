import { requireSession, withApiHandler, jsonOk, ApiError } from '@/lib/api-route';
import { writeSystemLog } from '@/lib/system-log';
import * as fs from 'node:fs';
import * as path from 'node:path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'cpe-monitor.db');

export const POST = withApiHandler(async (request) => {
  await requireSession();

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    throw new ApiError('请上传数据库文件', 400);
  }

  if (!file.name.endsWith('.db')) {
    throw new ApiError('仅支持 .db 格式的数据库文件', 400);
  }

  // Read the uploaded file
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Basic validation: check if it's a SQLite database
  const header = buffer.slice(0, 16).toString('ascii');
  if (!header.startsWith('SQLite format 3')) {
    throw new ApiError('无效的数据库文件', 400);
  }

  // Create a backup of the current database before restoring
  const backupDir = path.join(process.cwd(), 'data', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const preRestoreBackup = path.join(backupDir, `pre-restore-${timestamp}.db`);

  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, preRestoreBackup);
  }

  // Write the new database file
  fs.writeFileSync(DB_PATH, buffer);

  // Remove WAL and SHM files if they exist
  const walPath = `${DB_PATH}-wal`;
  const shmPath = `${DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  writeSystemLog('warn', `数据库已恢复，恢复前备份: ${preRestoreBackup}`);

  return jsonOk({
    success: true,
    message: '数据库恢复成功，请刷新页面。恢复前的数据库已自动备份。',
    preRestoreBackup,
  });
}, '恢复数据库失败');
