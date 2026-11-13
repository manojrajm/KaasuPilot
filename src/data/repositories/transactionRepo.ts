import { Transaction, TransactionFilters } from '@/domain/types';
import { getDb } from '@/data/db/client';
import { localMonthRangeIso } from '@/utils/date';
import { createId } from '@/utils/id';

/** Row shape exactly as stored in the `transactions` table. */
interface TransactionRow {
  id: string;
  account_id: string;
  amount_paise: number;
  direction: Transaction['direction'];
  category_id: string;
  merchant: string;
  note: string | null;
  txn_date: string;
  source: Transaction['source'];
  status: Transaction['status'];
  tax_tag: Transaction['taxTag'] | null;
}

const SELECT_COLUMNS = `
  id, account_id, amount_paise, direction, category_id, merchant,
  note, txn_date, source, status, tax_tag
`;

function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    amountPaise: row.amount_paise,
    direction: row.direction,
    categoryId: row.category_id,
    merchant: row.merchant,
    note: row.note ?? undefined,
    txnDate: row.txn_date,
    source: row.source,
    status: row.status,
    taxTag: row.tax_tag ?? null,
  };
}

/** Escapes LIKE wildcards so a search for "50%" matches the literal text. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

type ChangeListener = () => void;
const listeners: Set<ChangeListener> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export interface MonthlyTotals {
  totalIncomePaise: number;
  totalExpensePaise: number;
  count: number;
}

export const transactionRepo = {
  /** Called after every write, so every screen showing ledger data can reload. */
  subscribe(callback: ChangeListener) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  async getAll(filters?: TransactionFilters): Promise<Transaction[]> {
    const db = await getDb();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (filters?.direction && filters.direction !== 'all') {
      where.push('direction = ?');
      params.push(filters.direction);
    }
    if (filters?.categoryId) {
      where.push('category_id = ?');
      params.push(filters.categoryId);
    }
    if (filters?.accountId) {
      where.push('account_id = ?');
      params.push(filters.accountId);
    }
    if (filters?.startDate) {
      where.push('txn_date >= ?');
      params.push(filters.startDate);
    }
    if (filters?.endDate) {
      where.push('txn_date < ?');
      params.push(filters.endDate);
    }
    const query = filters?.searchQuery?.trim();
    if (query) {
      const pattern = `%${escapeLike(query)}%`;
      where.push(`(merchant LIKE ? ESCAPE '\\' OR note LIKE ? ESCAPE '\\')`);
      params.push(pattern, pattern);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.getAllAsync<TransactionRow>(
      `SELECT ${SELECT_COLUMNS} FROM transactions ${whereSql} ORDER BY txn_date DESC, created_at DESC`,
      params
    );
    return rows.map(rowToTransaction);
  },

  async getById(id: string): Promise<Transaction | undefined> {
    const db = await getDb();
    const row = await db.getFirstAsync<TransactionRow>(
      `SELECT ${SELECT_COLUMNS} FROM transactions WHERE id = ?`,
      id
    );
    return row ? rowToTransaction(row) : undefined;
  },

  /** Most recent non-ignored transactions, for the home activity feed. */
  async getRecent(limit = 5): Promise<Transaction[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<TransactionRow>(
      `SELECT ${SELECT_COLUMNS} FROM transactions
       WHERE status != 'ignored'
       ORDER BY txn_date DESC, created_at DESC
       LIMIT ?`,
      limit
    );
    return rows.map(rowToTransaction);
  },

  async create(data: Omit<Transaction, 'id'>): Promise<Transaction> {
    if (!Number.isInteger(data.amountPaise) || data.amountPaise <= 0) {
      throw new Error('Transaction amount must be a positive whole number of paise');
    }
    const db = await getDb();
    const newTxn: Transaction = { ...data, id: createId('tx') };
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO transactions
         (id, account_id, amount_paise, direction, category_id, merchant, note,
          txn_date, source, status, tax_tag, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newTxn.id,
      newTxn.accountId,
      newTxn.amountPaise,
      newTxn.direction,
      newTxn.categoryId,
      newTxn.merchant,
      newTxn.note ?? null,
      newTxn.txnDate,
      newTxn.source,
      newTxn.status,
      newTxn.taxTag ?? null,
      now,
      now
    );

    notifyListeners();
    return newTxn;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    const result = await db.runAsync('DELETE FROM transactions WHERE id = ?', id);
    if (result.changes > 0) {
      notifyListeners();
      return true;
    }
    return false;
  },

  /**
   * Confirmed income and expense for the local calendar month containing `monthDate`
   * (defaults to the current month). Pending and ignored rows are excluded.
   */
  async getMonthlyTotals(monthDate: Date = new Date()): Promise<MonthlyTotals> {
    const db = await getDb();
    const { startIso, endIso } = localMonthRangeIso(monthDate);
    const row = await db.getFirstAsync<{
      income: number | null;
      expense: number | null;
      count: number;
    }>(
      `SELECT
         SUM(CASE WHEN direction = 'credit' THEN amount_paise ELSE 0 END) AS income,
         SUM(CASE WHEN direction = 'debit'  THEN amount_paise ELSE 0 END) AS expense,
         COUNT(*) AS count
       FROM transactions
       WHERE status = 'confirmed' AND txn_date >= ? AND txn_date < ?`,
      startIso,
      endIso
    );
    return {
      totalIncomePaise: row?.income ?? 0,
      totalExpensePaise: row?.expense ?? 0,
      count: row?.count ?? 0,
    };
  },

  /** Number of SMS-parsed rows waiting for the user to confirm. */
  async countPendingReview(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM transactions WHERE status = 'pending_review'`
    );
    return row?.count ?? 0;
  },
};
