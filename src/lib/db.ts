import fs from 'fs';
import path from 'path';
import { toSqliteTimestamp } from './date-time.ts';

export interface SqliteRunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export interface SqliteStatement {
  run: (...params: unknown[]) => SqliteRunResult;
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
}

export interface SqliteDatabase {
  prepare: (sql: string) => SqliteStatement;
  exec: (sql: string) => SqliteDatabase;
  pragma: (source: string, options?: { simple?: boolean }) => unknown;
  transaction: <T>(task: () => T) => () => T;
  close: () => void;
}

type SqliteDatabaseConstructor = new (filename: string) => SqliteDatabase;
type Migration = (database: SqliteDatabase) => void;

let databaseInstance: SqliteDatabase | null = null;
let databaseInitialized = false;
let databaseInitializing = false;

function getDatabasePath(): string {
  return process.env.CPE_DATABASE_PATH
    ? path.resolve(process.env.CPE_DATABASE_PATH)
    : path.join(process.cwd(), 'data', 'cpe-monitor.db');
}

export function getDb(): SqliteDatabase {
  if (databaseInstance) return databaseInstance;

  // Keep the native dependency server-only and lazily loaded for Next standalone builds.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require('better-sqlite3') as SqliteDatabaseConstructor;
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  databaseInstance = new Database(dbPath);
  databaseInstance.pragma('journal_mode = WAL');
  databaseInstance.pragma('foreign_keys = ON');
  return databaseInstance;
}

/** Lazy proxy retained for compatibility while repositories are introduced. */
export const db: SqliteDatabase = new Proxy({} as SqliteDatabase, {
  get(_target, property) {
    const database = getDb();
    const value = Reflect.get(database, property) as unknown;
    return typeof value === 'function' ? value.bind(database) : value;
  },
});

function ensureColumn(
  database: SqliteDatabase,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((column) => column.name === columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

const migrations: Array<{ version: number; migrate: Migration }> = [
  {
    version: 1,
    migrate(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cpe_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cpe_url TEXT NOT NULL DEFAULT 'http://192.168.31.1',
          cpe_username TEXT DEFAULT 'admin',
          cpe_password_encrypted TEXT,
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS cpe_sessions (
          profile_key TEXT PRIMARY KEY,
          cpe_url TEXT NOT NULL,
          cpe_username TEXT NOT NULL,
          encrypted_payload TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS collection_runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at TEXT DEFAULT (datetime('now')),
          completed_at TEXT,
          status TEXT NOT NULL DEFAULT 'running',
          source TEXT NOT NULL DEFAULT 'scheduler',
          connected_devices INTEGER DEFAULT 0,
          error_message TEXT
        );

        CREATE TABLE IF NOT EXISTS notification_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          config TEXT NOT NULL,
          enabled INTEGER DEFAULT 1,
          updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS traffic_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT DEFAULT (datetime('now')),
          upload_bytes INTEGER,
          download_bytes INTEGER,
          connected_devices INTEGER,
          signal_strength INTEGER
        );

        CREATE TABLE IF NOT EXISTS device_data (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp TEXT DEFAULT (datetime('now')),
          device_name TEXT,
          device_ip TEXT,
          device_mac TEXT,
          upload_bytes INTEGER,
          download_bytes INTEGER,
          online_duration INTEGER
        );

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
        );

        CREATE TABLE IF NOT EXISTS alert_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          rule_id INTEGER REFERENCES alert_rules(id),
          triggered_at TEXT DEFAULT (datetime('now')),
          message TEXT,
          notified INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS system_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );

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
        );

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
        );
      `);
    },
  },
  {
    version: 2,
    migrate(database) {
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
    },
  },
  {
    version: 3,
    migrate(database) {
      database.exec(`
        CREATE INDEX IF NOT EXISTS idx_traffic_data_timestamp
        ON traffic_data (timestamp);
        CREATE INDEX IF NOT EXISTS idx_traffic_data_collection
        ON traffic_data (collection_id);
        CREATE INDEX IF NOT EXISTS idx_device_data_mac_timestamp
        ON device_data (device_mac, timestamp);
        CREATE INDEX IF NOT EXISTS idx_device_data_collection
        ON device_data (collection_id);
        CREATE INDEX IF NOT EXISTS idx_device_data_timestamp
        ON device_data (timestamp);
        CREATE INDEX IF NOT EXISTS idx_collection_runs_status_completed
        ON collection_runs (status, completed_at);
        CREATE INDEX IF NOT EXISTS idx_alert_logs_rule_triggered
        ON alert_logs (rule_id, triggered_at);
        CREATE INDEX IF NOT EXISTS idx_sms_messages_received_at
        ON sms_messages (received_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sms_messages_unread_received_at
        ON sms_messages (unread, received_at DESC);
      `);

      const insertDefault = database.prepare(
        'INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)',
      );
      const defaults: Array<[string, string]> = [
        ['scheduler_enabled', 'false'],
        ['scheduler_interval', '60'],
        ['sms_sync_enabled', 'true'],
        ['sms_sync_interval', '15'],
        ['sms_initial_sync_completed', 'false'],
        ['sms_last_sync_at', ''],
        ['sms_last_sync_error', ''],
        ['history_retention_days', '90'],
        ['collection_run_retention_days', '180'],
        ['history_last_cleanup_at', ''],
      ];
      for (const [key, value] of defaults) insertDefault.run(key, value);
    },
  },
  {
    version: 4,
    migrate(database) {
      // Legacy deployments could create duplicate singleton rows. Keep the newest
      // value before adding constraints required by deterministic upserts.
      database.exec(`
        DELETE FROM notification_config
        WHERE id NOT IN (
          SELECT MAX(id) FROM notification_config GROUP BY type
        );
        DELETE FROM daily_reports
        WHERE id NOT IN (
          SELECT MAX(id) FROM daily_reports GROUP BY report_date
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_config_type_unique
        ON notification_config (type);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reports_date_unique
        ON daily_reports (report_date);
      `);
    },
  },
  {
    version: 5,
    migrate(database) {
      database.exec(`
        CREATE TABLE IF NOT EXISTS cpe_device_snapshots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          collected_at TEXT NOT NULL DEFAULT (datetime('now')),
          source TEXT NOT NULL DEFAULT 'scheduler',
          device_name TEXT,
          friendly_name TEXT,
          product_name_zh TEXT,
          product_name_en TEXT,
          software_version TEXT,
          hardware_version TEXT,
          webui_version TEXT,
          workmode TEXT,
          supportmode TEXT,
          imei TEXT,
          imsi TEXT,
          iccid TEXT,
          msisdn TEXT,
          serial_number TEXT,
          mccmnc TEXT,
          mac_address1 TEXT,
          wan_ip TEXT,
          wan_ipv6 TEXT,
          uptime_seconds INTEGER,
          carrier TEXT,
          plmn_code TEXT,
          network_type TEXT,
          connection_status TEXT,
          sim_status TEXT,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cpe_device_profile (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          source TEXT NOT NULL DEFAULT 'scheduler',
          device_name TEXT,
          friendly_name TEXT,
          product_name_zh TEXT,
          product_name_en TEXT,
          software_version TEXT,
          hardware_version TEXT,
          webui_version TEXT,
          workmode TEXT,
          supportmode TEXT,
          imei TEXT,
          imsi TEXT,
          iccid TEXT,
          msisdn TEXT,
          serial_number TEXT,
          mccmnc TEXT,
          mac_address1 TEXT,
          wan_ip TEXT,
          wan_ipv6 TEXT,
          uptime_seconds INTEGER,
          carrier TEXT,
          plmn_code TEXT,
          network_type TEXT,
          connection_status TEXT,
          sim_status TEXT,
          payload_json TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_cpe_device_snapshots_collected
        ON cpe_device_snapshots (collected_at DESC);
      `);

      const insertDefault = database.prepare(
        'INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)',
      );
      const defaults: Array<[string, string]> = [
        ['device_info_sync_enabled', 'true'],
        ['device_info_sync_interval', '360'],
        ['device_info_last_sync_at', ''],
        ['device_info_last_sync_error', ''],
      ];
      for (const [key, value] of defaults) insertDefault.run(key, value);
    },
  },
  {
    version: 6,
    migrate(database) {
      ensureColumn(database, 'daily_reports', 'period_type', "TEXT DEFAULT 'daily'");
      database.exec(`
        DROP INDEX IF EXISTS idx_daily_reports_date_unique;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reports_date_period_unique
        ON daily_reports (report_date, period_type);
      `);
    },
  },
];

function readSchemaVersion(database: SqliteDatabase): number {
  const row = database.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined;
  return Number(row?.user_version || 0);
}

export function runDatabaseMigrations(database: SqliteDatabase): number {
  let currentVersion = readSchemaVersion(database);
  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    database.transaction(() => {
      migration.migrate(database);
      database.pragma(`user_version = ${migration.version}`);
    })();
    currentVersion = migration.version;
  }
  return currentVersion;
}

/** Runs schema migrations once per process. */
export function initializeDatabase(): void {
  if (databaseInitialized || databaseInitializing) return;
  databaseInitializing = true;
  try {
    const appliedVersion = runDatabaseMigrations(getDb());
    databaseInitialized = true;
    console.info(`SQLite database ready (schema v${appliedVersion})`);
  } finally {
    databaseInitializing = false;
  }
}

export function ensureDatabaseReady(): void {
  if (!databaseInitialized) initializeDatabase();
}

export { toSqliteTimestamp };
