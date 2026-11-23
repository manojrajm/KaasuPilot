import * as SQLite from 'expo-sqlite';
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '@/data/seed/defaultCategories';

const DATABASE_NAME = 'kasupilot.db';
const LATEST_SCHEMA_VERSION = 3;

/** The one built-in account that is not a card: physical cash. */
export const CASH_ACCOUNT_ID = 'acc_cash';

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
    if (currentVersion < 2) {
      await migrateToV2(db);
    }
    if (currentVersion < 3) {
      await migrateToV3(db);
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

/**
 * v2: the user's own cards become accounts, loans move into the database,
 * and transactions get a `source_ref` so automatic entries (salary, EMI) are never duplicated.
 */
async function migrateToV2(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    ALTER TABLE accounts ADD COLUMN card_kind TEXT CHECK (card_kind IN ('debit', 'credit'));
    ALTER TABLE accounts ADD COLUMN bank_code TEXT;
    ALTER TABLE accounts ADD COLUMN network TEXT;
    ALTER TABLE accounts ADD COLUMN holder_name TEXT;
    ALTER TABLE accounts ADD COLUMN credit_limit_paise INTEGER;

    ALTER TABLE transactions ADD COLUMN source_ref TEXT;
    CREATE UNIQUE INDEX idx_transactions_source_ref
      ON transactions (source_ref) WHERE source_ref IS NOT NULL;

    CREATE TABLE loans (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      lender TEXT NOT NULL,
      principal_paise INTEGER NOT NULL CHECK (principal_paise > 0),
      balance_paise INTEGER NOT NULL CHECK (balance_paise >= 0),
      annual_rate_bps INTEGER NOT NULL CHECK (annual_rate_bps >= 0),
      tenure_months INTEGER NOT NULL CHECK (tenure_months > 0),
      months_paid INTEGER NOT NULL DEFAULT 0 CHECK (months_paid >= 0),
      start_date TEXT NOT NULL,
      emi_paise INTEGER NOT NULL CHECK (emi_paise > 0),
      emi_is_custom INTEGER NOT NULL DEFAULT 0,
      due_day INTEGER NOT NULL CHECK (due_day BETWEEN 1 AND 31),
      processing_fee_paise INTEGER NOT NULL DEFAULT 0,
      prepayments_paise INTEGER NOT NULL DEFAULT 0,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      status TEXT NOT NULL CHECK (status IN ('active', 'closed')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Remove the demo bank accounts and card; only cards the user creates remain.
  // A demo account that already has transactions is archived instead, so no history is lost.
  const demoIds = DEFAULT_ACCOUNTS.map((a) => a.id).filter((id) => id !== CASH_ACCOUNT_ID);
  for (const id of demoIds) {
    const used = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM transactions WHERE account_id = ?',
      id
    );
    if ((used?.n ?? 0) > 0) {
      await db.runAsync('UPDATE accounts SET is_archived = 1 WHERE id = ?', id);
    } else {
      await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
    }
  }

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, opening_balance_paise, color, created_at, updated_at)
     VALUES (?, 'Cash', 'cash', 0, '#2E7D32', ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = 'Cash', is_archived = 0`,
    CASH_ACCOUNT_ID,
    now,
    now
  );
}

/**
 * v3: introduces customized and dynamic categories for expense and income streams.
 * Pre-populates with default system categories on initial migration.
 */
async function migrateToV3(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon_name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      color TEXT NOT NULL,
      gradient_colors TEXT NOT NULL,
      category_type TEXT NOT NULL CHECK (category_type IN ('expense', 'income', 'both')),
      tax_section TEXT CHECK (tax_section IN ('80C', '80D', 'HRA')),
      is_system INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_categories_type ON categories (category_type, is_archived);
  `);

  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM categories');
  if ((countRow?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const cat = DEFAULT_CATEGORIES[i];
      await db.runAsync(
        `INSERT INTO categories
           (id, name, icon_name, emoji, color, gradient_colors, category_type, tax_section, is_system, is_archived, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)`,
        cat.id,
        cat.name,
        cat.iconName || 'other',
        cat.emoji,
        cat.color,
        JSON.stringify(cat.gradientColors),
        cat.categoryType || 'expense',
        cat.taxSection ?? null,
        i,
        now,
        now
      );
    }
  }
}
