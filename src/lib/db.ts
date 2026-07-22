import path from 'path';
import fs from 'fs';

let _db: any = null;

export function getDb() {
  if (!_db) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'data', 'cpe-monitor.db');
    const dataDir = path.dirname(dbPath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

// Proxy that lazily initializes
export const db = new Proxy({} as any, {
  get(_target, prop) {
    const database = getDb();
    const value = database[prop];
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  }
});

/** Idempotent schema bootstrap. Prefer this over per-route init flags. */
export function ensureDatabaseReady() {
  initializeDatabase();
}

export function toSqliteTimestamp(date: Date): string {
  // SQLite datetime('now') is stored as UTC text in `YYYY-MM-DD HH:mm:ss`.
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

interface SchemaDatabase {
  prepare: (sql: string) => {
    all: (...params: unknown[]) => unknown[];
  };
  exec: (sql: string) => void;
}

function ensureColumn(
  database: SchemaDatabase,
  tableName: string,
  columnName: string,
  definition: string,
) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((column) => column.name === columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export function initializeDatabase() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS cpe_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpe_url TEXT NOT NULL DEFAULT 'http://192.168.31.1',
      cpe_username TEXT DEFAULT 'admin',
      cpe_password_encrypted TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS cpe_sessions (
      profile_key TEXT PRIMARY KEY,
      cpe_url TEXT NOT NULL,
      cpe_username TEXT NOT NULL,
      encrypted_payload TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS collection_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      source TEXT NOT NULL DEFAULT 'scheduler',
      connected_devices INTEGER DEFAULT 0,
      error_message TEXT
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS notification_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      config TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS traffic_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      upload_bytes INTEGER,
      download_bytes INTEGER,
      connected_devices INTEGER,
      signal_strength INTEGER
    )
  `);

  ensureColumn(database, 'traffic_data', 'collection_id', 'INTEGER REFERENCES collection_runs(id)');
  ensureColumn(database, 'traffic_data', 'delta_upload_bytes', 'INTEGER');
  ensureColumn(database, 'traffic_data', 'delta_download_bytes', 'INTEGER');
  ensureColumn(database, 'traffic_data', 'upload_bps', 'REAL');
  ensureColumn(database, 'traffic_data', 'download_bps', 'REAL');
  ensureColumn(database, 'traffic_data', 'network_type', 'TEXT');
  ensureColumn(database, 'traffic_data', 'band', 'TEXT');
  ensureColumn(database, 'traffic_data', 'cell_id', 'TEXT');
  ensureColumn(database, 'traffic_data', 'pci', 'TEXT');
  ensureColumn(database, 'traffic_data', 'rsrp', 'REAL');
  ensureColumn(database, 'traffic_data', 'rsrq', 'REAL');
  ensureColumn(database, 'traffic_data', 'sinr', 'REAL');
  ensureColumn(database, 'traffic_data', 'rssi', 'REAL');

  database.exec(`
    CREATE TABLE IF NOT EXISTS device_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      device_name TEXT,
      device_ip TEXT,
      device_mac TEXT,
      upload_bytes INTEGER,
      download_bytes INTEGER,
      online_duration INTEGER
    )
  `);

  ensureColumn(database, 'device_data', 'collection_id', 'INTEGER REFERENCES collection_runs(id)');
  ensureColumn(database, 'device_data', 'delta_upload_bytes', 'INTEGER');
  ensureColumn(database, 'device_data', 'delta_download_bytes', 'INTEGER');
  ensureColumn(database, 'device_data', 'upload_bps', 'REAL');
  ensureColumn(database, 'device_data', 'download_bps', 'REAL');
  ensureColumn(database, 'device_data', 'active', 'INTEGER DEFAULT 1');
  ensureColumn(database, 'device_data', 'interface_type', 'TEXT');
  ensureColumn(database, 'device_data', 'frequency', 'TEXT');
  ensureColumn(database, 'device_data', 'rssi', 'REAL');
  ensureColumn(database, 'device_data', 'raw_json', 'TEXT');

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_traffic_data_timestamp
    ON traffic_data (timestamp)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_traffic_data_collection
    ON traffic_data (collection_id)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_device_data_mac_timestamp
    ON device_data (device_mac, timestamp)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_device_data_collection
    ON device_data (collection_id)
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      metric_type TEXT NOT NULL,
      threshold REAL NOT NULL,
      operator TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      notify_email INTEGER DEFAULT 1,
      notify_wechat INTEGER DEFAULT 1,
      cooldown_minutes INTEGER DEFAULT 30,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS alert_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER REFERENCES alert_rules(id),
      triggered_at TEXT DEFAULT (datetime('now')),
      message TEXT,
      notified INTEGER DEFAULT 0
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS daily_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_date TEXT NOT NULL,
      total_upload INTEGER,
      total_download INTEGER,
      peak_hour INTEGER,
      top_devices TEXT,
      avg_signal INTEGER,
      uptime_percent REAL,
      network_quality TEXT,
      sent_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS sms_messages (
      fingerprint TEXT PRIMARY KEY,
      message_id TEXT,
      phone TEXT NOT NULL,
      content TEXT NOT NULL,
      received_at TEXT,
      unread INTEGER DEFAULT 0,
      direction TEXT DEFAULT 'inbound',
      notified INTEGER DEFAULT 0,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sms_messages_received_at
    ON sms_messages (received_at DESC)
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sms_messages_unread_received_at
    ON sms_messages (unread, received_at DESC)
  `);

  const stmt = database.prepare('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)');
  stmt.run('scheduler_enabled', 'false');
  stmt.run('scheduler_interval', '60');
  stmt.run('sms_sync_enabled', 'true');
  stmt.run('sms_sync_interval', '15');
  stmt.run('sms_initial_sync_completed', 'false');
  stmt.run('sms_last_sync_at', '');
  stmt.run('sms_last_sync_error', '');
  stmt.run('history_retention_days', '90');
  stmt.run('collection_run_retention_days', '180');
  stmt.run('history_last_cleanup_at', '');

  console.log('SQLite database initialized');
}
