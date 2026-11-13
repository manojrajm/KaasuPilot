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
  balance_paise: number;
}

export const accountRepo = {
  /** Balances change only when transactions change, so reuse the ledger's change feed. */
  subscribe(callback: () => void) {
    return transactionRepo.subscribe(callback);
  },

  /**
   * Active accounts with live balances:
   * opening balance + confirmed credits − confirmed debits.
   */
  async getAll(): Promise<Account[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<AccountBalanceRow>(
      `SELECT
         a.id, a.name, a.type, a.institution, a.last_four_digits, a.color,
         a.opening_balance_paise + COALESCE(SUM(
           CASE
             WHEN t.status != 'confirmed' THEN 0
             WHEN t.direction = 'credit' THEN t.amount_paise
             ELSE -t.amount_paise
           END
         ), 0) AS balance_paise
       FROM accounts a
       LEFT JOIN transactions t ON t.account_id = a.id
       WHERE a.is_archived = 0
       GROUP BY a.id
       ORDER BY a.rowid`
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      institution: row.institution ?? undefined,
      lastFourDigits: row.last_four_digits ?? undefined,
      currentBalancePaise: row.balance_paise,
      color: row.color,
    }));
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
};
