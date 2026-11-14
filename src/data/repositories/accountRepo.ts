import { Account } from '@/domain/types';
import { getDb } from '@/data/db/client';
import { transactionRepo } from './transactionRepo';

interface AccountBalanceRow {
  id: string;
  name: string;
  type: Account['type'];
  institution: string | null;
  last_four_digits: string | null;
  color: string;
  card_kind: Account['cardKind'] | null;
  bank_code: Account['bankCode'] | null;
  network: Account['network'] | null;
  holder_name: string | null;
  credit_limit_paise: number | null;
  balance_paise: number;
}

const listeners: Set<() => void> = new Set();

function rowToAccount(row: AccountBalanceRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution ?? undefined,
    lastFourDigits: row.last_four_digits ?? undefined,
    currentBalancePaise: row.balance_paise,
    color: row.color,
    cardKind: row.card_kind ?? undefined,
    bankCode: row.bank_code ?? undefined,
    network: row.network ?? undefined,
    holderName: row.holder_name ?? undefined,
    creditLimitPaise: row.credit_limit_paise ?? undefined,
  };
}

/**
 * Live balance = opening balance + confirmed credits − confirmed debits.
 * Credit cards therefore show a negative balance equal to the amount owed.
 */
const BALANCE_QUERY = `
  SELECT
    a.id, a.name, a.type, a.institution, a.last_four_digits, a.color,
    a.card_kind, a.bank_code, a.network, a.holder_name, a.credit_limit_paise,
    a.opening_balance_paise + COALESCE(SUM(
      CASE
        WHEN t.status != 'confirmed' THEN 0
        WHEN t.direction = 'credit' THEN t.amount_paise
        ELSE -t.amount_paise
      END
    ), 0) AS balance_paise
  FROM accounts a
  LEFT JOIN transactions t ON t.account_id = a.id
`;

export const accountRepo = {
  /** Fires when accounts are added/edited or when any transaction changes a balance. */
  subscribe(callback: () => void) {
    listeners.add(callback);
    const unsubscribeLedger = transactionRepo.subscribe(callback);
    return () => {
      listeners.delete(callback);
      unsubscribeLedger();
    };
  },

  /** Called by repositories that write to the accounts table. */
  notifyChanged() {
    listeners.forEach((fn) => fn());
  },

  /** Active accounts: the user's cards first (newest last), then Cash. */
  async getAll(): Promise<Account[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<AccountBalanceRow>(
      `${BALANCE_QUERY}
       WHERE a.is_archived = 0
       GROUP BY a.id
       ORDER BY CASE WHEN a.card_kind IS NULL THEN 1 ELSE 0 END, a.rowid`
    );
    return rows.map(rowToAccount);
  },

  /** Any account, including archived ones (so old transactions can still show their account). */
  async getById(id: string): Promise<Account | undefined> {
    const db = await getDb();
    const row = await db.getFirstAsync<AccountBalanceRow>(
      `${BALANCE_QUERY} WHERE a.id = ? GROUP BY a.id`,
      id
    );
    return row ? rowToAccount(row) : undefined;
  },

  /** Names of every account ever created, for labelling historical transactions. */
  async getNameMap(): Promise<Record<string, Account>> {
    const db = await getDb();
    const rows = await db.getAllAsync<AccountBalanceRow>(`${BALANCE_QUERY} GROUP BY a.id`);
    return Object.fromEntries(rows.map((r) => [r.id, rowToAccount(r)]));
  },

  /**
   * Money the user can actually spend: bank, cash and wallet balances.
   * Credit cards are excluded because their balance is debt, not funds.
   */
  async getLiquidBalancePaise(): Promise<number> {
    const accounts = await accountRepo.getAll();
    return accounts
      .filter((a) => a.type !== 'card')
      .reduce((sum, a) => sum + a.currentBalancePaise, 0);
  },

  /** Matches an account by bank code and/or last 4 digits (for SMS transaction attribution). */
  async findByBankAndLastFour(bankCode?: Account['bankCode'], lastFour?: string): Promise<Account | undefined> {
    const accounts = await accountRepo.getAll();
    if (!bankCode && !lastFour) return undefined;

    // 1. Exact match on both bankCode and lastFourDigits
    if (bankCode && lastFour) {
      const exact = accounts.find(
        (a) => a.bankCode === bankCode && a.lastFourDigits?.endsWith(lastFour)
      );
      if (exact) return exact;
    }

    // 2. Match on lastFourDigits only (if unique)
    if (lastFour) {
      const byDigits = accounts.filter((a) => a.lastFourDigits?.endsWith(lastFour));
      if (byDigits.length === 1) return byDigits[0];
    }

    // 3. Fallback: match by bankCode only (if user has only 1 account in that bank)
    if (bankCode) {
      const byBank = accounts.filter((a) => a.bankCode === bankCode);
      if (byBank.length === 1) return byBank[0];
    }

    return undefined;
  },
};
