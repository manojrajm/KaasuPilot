import * as SQLite from 'expo-sqlite';
import { DEFAULT_ACCOUNTS } from '@/data/seed/defaultCategories';

const DATABASE_NAME = 'kasupilot.db';
const LATEST_SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Returns the single shared on-device database connection.
 * The first call opens the file and runs migrations; later calls reuse the same promise,
 * so every repository waits for migrations before touching any table.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate().catch((error) => {
      // Allow a later call to retry instead of caching the failure forever.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Connection settings must be applied outside the migration transaction.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if (row === null) {
    throw new Error('Could not read the database schema version');
  }
  const currentVersion = row.user_version;
  if (currentVersion > LATEST_SCHEMA_VERSION) {
    throw new Error('Database schema is newer than this app supports');
  }
  if (currentVersion === LATEST_SCHEMA_VERSION) {
    return db;
  }

  // Schema changes and the user_version bump share one transaction, so a failure rolls back both.
  await db.withTransactionAsync(async () => {
    if (currentVersion < 1) {
      await migrateToV1(db);
    }
    await db.execAsync(`PRAGMA user_version = ${LATEST_SCHEMA_VERSION}`);
  });

  return db;
}

async function migrateToV1(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('bank', 'cash', 'wallet', 'card')),
      institution TEXT,
      last_four_digits TEXT,
      opening_balance_paise INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
      direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
      category_id TEXT NOT NULL,
      merchant TEXT NOT NULL,
      note TEXT,
      txn_date TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('manual', 'voice', 'ocr', 'sms')),
      status TEXT NOT NULL CHECK (status IN ('confirmed', 'pending_review', 'ignored')),
      tax_tag TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX idx_transactions_txn_date ON transactions (txn_date);
    CREATE INDEX idx_transactions_category_date ON transactions (category_id, txn_date);
    CREATE INDEX idx_transactions_account ON transactions (account_id);

    CREATE TABLE settings (
      key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL
    );
  `);

  // Seed the account list only. Balances start at zero so every figure on the
  // dashboard comes from transactions the user actually records.
  const now = new Date().toISOString();
  for (const account of DEFAULT_ACCOUNTS) {
    await db.runAsync(
      `INSERT INTO accounts
         (id, name, type, institution, last_four_digits, opening_balance_paise, color, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      account.id,
      account.name,
      account.type,
      account.institution ?? null,
      account.lastFourDigits ?? null,
      account.color,
      now,
      now
    );
  }
}
