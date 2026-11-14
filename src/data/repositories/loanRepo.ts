import { Loan, LoanType, PrepaymentStrategy } from '@/domain/types';
import { Paise } from '@/domain/money/paise';
import { calculatePrepaymentImpact } from '@/domain/loans/prepayment';
import { monthlyInterest, startDateFromFirstEmi } from '@/domain/loans/schedule';
import { getDb } from '@/data/db/client';
import { createId } from '@/utils/id';
import { transactionRepo } from './transactionRepo';

interface LoanRow {
  id: string;
  name: string;
  type: LoanType;
  lender: string;
  principal_paise: number;
  balance_paise: number;
  annual_rate_bps: number;
  tenure_months: number;
  months_paid: number;
  start_date: string;
  emi_paise: number;
  emi_is_custom: number;
  due_day: number;
  processing_fee_paise: number;
  prepayments_paise: number;
  account_id: string;
  status: Loan['status'];
}

function rowToLoan(row: LoanRow): Loan {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    lender: row.lender,
    principalPaise: row.principal_paise,
    balancePaise: row.balance_paise,
    annualRateBps: row.annual_rate_bps,
    tenureMonths: row.tenure_months,
    monthsPaid: row.months_paid,
    startDate: row.start_date,
    emiPaise: row.emi_paise,
    emiIsCustom: row.emi_is_custom === 1,
    dueDayOfMonth: row.due_day,
    processingFeePaise: row.processing_fee_paise,
    prepaymentsPaise: row.prepayments_paise,
    accountId: row.account_id,
    status: row.status,
  };
}

/** Everything the "Add loan" form collects. */
export interface LoanInput {
  name: string;
  type: LoanType;
  lender: string;
  principalPaise: Paise;
  annualRateBps: number;
  tenureMonths: number;
  /** Date of the first EMI; its day of month becomes the EMI due day. */
  firstEmiDate: Date;
  emiPaise: Paise;
  emiIsCustom: boolean;
  monthsPaid: number;
  /** Outstanding principal today. */
  balancePaise: Paise;
  processingFeePaise: Paise;
  /** Account the EMI is debited from. */
  accountId: string;
}

export type PayResult = { ok: true; amountPaise: Paise } | { ok: false; reason: string };

type LoanChangeListener = () => void;
const listeners: Set<LoanChangeListener> = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export const loanRepo = {
  subscribe(callback: LoanChangeListener) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  async getAll(): Promise<Loan[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<LoanRow>(
      `SELECT * FROM loans ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at`
    );
    return rows.map(rowToLoan);
  },

  async getById(id: string): Promise<Loan | undefined> {
    const db = await getDb();
    const row = await db.getFirstAsync<LoanRow>('SELECT * FROM loans WHERE id = ?', id);
    return row ? rowToLoan(row) : undefined;
  },

  async create(input: LoanInput): Promise<Loan> {
    const db = await getDb();
    const id = createId('loan');
    const now = new Date().toISOString();
    const status = input.balancePaise > 0 && input.monthsPaid < input.tenureMonths ? 'active' : 'closed';

    await db.runAsync(
      `INSERT INTO loans
         (id, name, type, lender, principal_paise, balance_paise, annual_rate_bps, tenure_months,
          months_paid, start_date, emi_paise, emi_is_custom, due_day, processing_fee_paise,
          prepayments_paise, account_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      id,
      input.name.trim(),
      input.type,
      input.lender.trim(),
      input.principalPaise,
      input.balancePaise,
      input.annualRateBps,
      input.tenureMonths,
      input.monthsPaid,
      startDateFromFirstEmi(input.firstEmiDate),
      input.emiPaise,
      input.emiIsCustom ? 1 : 0,
      input.firstEmiDate.getDate(),
      input.processingFeePaise,
      input.accountId,
      status,
      now,
      now
    );
    notify();
    const created = await loanRepo.getById(id);
    if (!created) throw new Error('Loan was not saved');
    return created;
  },

  async update(id: string, input: LoanInput): Promise<void> {
    const db = await getDb();
    const status = input.balancePaise > 0 && input.monthsPaid < input.tenureMonths ? 'active' : 'closed';
    await db.runAsync(
      `UPDATE loans SET
         name = ?, type = ?, lender = ?, principal_paise = ?, balance_paise = ?, annual_rate_bps = ?,
         tenure_months = ?, months_paid = ?, start_date = ?, emi_paise = ?, emi_is_custom = ?,
         due_day = ?, processing_fee_paise = ?, account_id = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      input.name.trim(),
      input.type,
      input.lender.trim(),
      input.principalPaise,
      input.balancePaise,
      input.annualRateBps,
      input.tenureMonths,
      input.monthsPaid,
      startDateFromFirstEmi(input.firstEmiDate),
      input.emiPaise,
      input.emiIsCustom ? 1 : 0,
      input.firstEmiDate.getDate(),
      input.processingFeePaise,
      input.accountId,
      status,
      new Date().toISOString(),
      id
    );
    notify();
  },

  /** Deletes the loan record. EMI payments already in the ledger are kept. */
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM loans WHERE id = ?', id);
    notify();
  },

  /**
   * Pays the next instalment: splits it into interest and principal, advances the schedule
   * and records the EMI debit in the ledger, all in one database transaction.
   * A ledger ref per instalment makes a double tap unable to pay the same EMI twice.
   */
  async payNextEmi(loanId: string): Promise<PayResult> {
    const db = await getDb();
    // `as` keeps TypeScript from narrowing to the initial value; the callback reassigns it.
    let result = { ok: false, reason: 'Loan not found' } as PayResult;

    await db.withTransactionAsync(async () => {
      const row = await db.getFirstAsync<LoanRow>('SELECT * FROM loans WHERE id = ?', loanId);
      if (!row) return;
      if (row.status !== 'active' || row.balance_paise <= 0) {
        result = { ok: false, reason: 'This loan is already closed' };
        return;
      }

      const instalment = row.months_paid + 1;
      const interest = monthlyInterest(row.balance_paise, row.annual_rate_bps);
      // The final EMI only needs to clear what is left.
      const amount = Math.min(row.emi_paise, row.balance_paise + interest);
      const principalPart = Math.max(0, amount - interest);
      const newBalance = Math.max(0, row.balance_paise - principalPart);
      const closed = newBalance === 0;

      const txn = await transactionRepo.create(
        {
          accountId: row.account_id,
          amountPaise: amount,
          direction: 'debit',
          categoryId: 'cat_emi',
          merchant: `${row.name} EMI`,
          note: `Instalment #${instalment} of ${row.tenure_months} · ${row.lender}`,
          txnDate: new Date().toISOString(),
          source: 'manual',
          status: 'confirmed',
        },
        { sourceRef: `emi:${loanId}:${instalment}`, notify: false }
      );
      if (!txn) {
        result = { ok: false, reason: 'This instalment is already recorded' };
        return;
      }

      await db.runAsync(
        `UPDATE loans SET balance_paise = ?, months_paid = ?, status = ?, updated_at = ? WHERE id = ?`,
        newBalance,
        instalment,
        closed ? 'closed' : 'active',
        new Date().toISOString(),
        loanId
      );
      result = { ok: true, amountPaise: amount };
    });

    if (result.ok) {
      notify();
      transactionRepo.notifyChanged();
    }
    return result;
  },

  /** Applies a lump-sum prepayment and records it in the ledger as an EMI-category debit. */
  async recordPrepayment(
    loanId: string,
    lumpSumPaise: Paise,
    strategy: PrepaymentStrategy
  ): Promise<boolean> {
    const loan = await loanRepo.getById(loanId);
    if (!loan || lumpSumPaise <= 0) return false;
    const amount = Math.min(lumpSumPaise, loan.balancePaise);
    const impact = calculatePrepaymentImpact(loan, amount, strategy);
    const newBalance = Math.max(0, loan.balancePaise - amount);
    const db = await getDb();

    await db.withTransactionAsync(async () => {
      await transactionRepo.create(
        {
          accountId: loan.accountId,
          amountPaise: amount,
          direction: 'debit',
          categoryId: 'cat_emi',
          merchant: `${loan.name} prepayment`,
          note: strategy === 'reduce_tenure' ? 'Prepayment · tenure reduced' : 'Prepayment · EMI reduced',
          txnDate: new Date().toISOString(),
          source: 'manual',
          status: 'confirmed',
        },
        { notify: false }
      );
      await db.runAsync(
        `UPDATE loans SET balance_paise = ?, prepayments_paise = prepayments_paise + ?,
           tenure_months = ?, emi_paise = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        newBalance,
        amount,
        strategy === 'reduce_tenure' ? impact.newTenureMonths : loan.tenureMonths,
        strategy === 'reduce_emi' && impact.newEmiPaise > 0 ? impact.newEmiPaise : loan.emiPaise,
        newBalance === 0 ? 'closed' : 'active',
        new Date().toISOString(),
        loanId
      );
    });

    notify();
    transactionRepo.notifyChanged();
    return true;
  },
};
