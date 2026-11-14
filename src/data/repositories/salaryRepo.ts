import {
  calculateCycleBalance,
  CycleBalance,
  cycleContaining,
  cycleFromKey,
  cyclesSince,
  SalaryCycle,
} from '@/domain/budget/salaryCycle';
import { Paise } from '@/domain/money/paise';
import { SalaryState, UserProfile } from '@/domain/profile/types';
import { CASH_ACCOUNT_ID, getDb } from '@/data/db/client';
import { settingsRepo } from './settingsRepo';
import { MonthlyTotals, transactionRepo } from './transactionRepo';

const salaryRef = (cycleKey: string) => `salary:${cycleKey}`;

export interface CycleSnapshot {
  cycle: SalaryCycle;
  totals: MonthlyTotals;
  balance: CycleBalance;
  state: SalaryState;
}

async function cycleTotals(cycle: SalaryCycle): Promise<MonthlyTotals> {
  return transactionRepo.getTotalsInRange(cycle.start.toISOString(), cycle.end.toISOString());
}

/** Inserts the automatic salary credit for a cycle (no-op if it already exists). */
async function creditSalary(profile: UserProfile, cycle: SalaryCycle): Promise<void> {
  await transactionRepo.create(
    {
      accountId: profile.salaryAccountId ?? CASH_ACCOUNT_ID,
      amountPaise: profile.monthlyIncomePaise,
      direction: 'credit',
      categoryId: 'cat_income',
      merchant: 'Monthly Salary',
      note: 'Added automatically on salary day',
      txnDate: cycle.start.toISOString(),
      source: 'manual',
      status: 'confirmed',
    },
    { sourceRef: salaryRef(cycle.key), notify: false }
  );
}

/**
 * Salary engine:
 * - Each salary date, the monthly salary is credited to the ledger automatically.
 * - Available balance = carried-in balance + income in the cycle − spending in the cycle.
 * - When a cycle ends with money left, the user chooses to carry it forward or move it to savings.
 */
export const salaryRepo = {
  /**
   * Credits any salary dates that passed since the last run. Safe to call often:
   * salary entries are keyed per cycle, so they are never added twice.
   */
  async sync(): Promise<void> {
    const profile = await settingsRepo.get('profile');
    if (profile.monthlyIncomePaise <= 0) return;
    const day = profile.salaryDayOfMonth;
    const state = await settingsRepo.get('salaryState');
    const current = cycleContaining(day);

    if (!state.lastCycleKey) {
      await creditSalary(profile, current);
      await settingsRepo.set('salaryState', { ...state, lastCycleKey: current.key });
      transactionRepo.notifyChanged();
      return;
    }

    const missed = cyclesSince(state.lastCycleKey, day);
    if (missed.length === 0) return;

    // An unanswered rollover from an earlier cycle is carried forward automatically.
    let carried = state.pendingRollover ? state.pendingRollover.previousBalancePaise : state.carriedInPaise;
    let previous = cycleFromKey(state.lastCycleKey, day);
    let pending: SalaryState['pendingRollover'] = null;

    for (let i = 0; i < missed.length; i++) {
      const cycle = missed[i];
      const prevTotals = await cycleTotals(previous);
      const left = calculateCycleBalance({
        carriedInPaise: carried,
        incomePaise: prevTotals.totalIncomePaise,
        spentPaise: prevTotals.totalExpensePaise,
      }).availablePaise;
      await creditSalary(profile, cycle);

      const isLatest = i === missed.length - 1;
      if (isLatest && left > 0) {
        // Ask the user what to do with what is left; nothing is carried until they answer.
        pending = { cycleKey: cycle.key, previousBalancePaise: left };
        carried = 0;
      } else {
        // Skipped cycles carry their surplus silently; an overspend is not carried as debt.
        carried = Math.max(0, left);
      }
      previous = cycle;
    }

    await settingsRepo.set('salaryState', {
      ...state,
      lastCycleKey: missed[missed.length - 1].key,
      carriedInPaise: carried,
      pendingRollover: pending,
    });
    transactionRepo.notifyChanged();
  },

  /** Answers the rollover prompt: add last cycle's balance to this one, or move it to savings. */
  async resolveRollover(choice: 'carry' | 'savings'): Promise<void> {
    const state = await settingsRepo.get('salaryState');
    if (!state.pendingRollover) return;
    const amount = state.pendingRollover.previousBalancePaise;
    await settingsRepo.set('salaryState', {
      ...state,
      carriedInPaise: choice === 'carry' ? amount : 0,
      savingsPaise: choice === 'savings' ? state.savingsPaise + amount : state.savingsPaise,
      pendingRollover: null,
    });
  },

  /**
   * Keeps the current cycle's automatic salary entry in step with the profile after the user
   * edits the salary amount, day or account.
   */
  async onSalaryConfigChanged(before: UserProfile, after: UserProfile): Promise<void> {
    const db = await getDb();
    const oldCycle = cycleContaining(before.salaryDayOfMonth);
    const ref = salaryRef(oldCycle.key);

    if (before.salaryDayOfMonth !== after.salaryDayOfMonth || after.monthlyIncomePaise <= 0) {
      // The cycle boundaries moved (or salary was cleared): re-credit under the new schedule.
      await db.runAsync('DELETE FROM transactions WHERE source_ref = ?', ref);
      const state = await settingsRepo.get('salaryState');
      await settingsRepo.set('salaryState', { ...state, lastCycleKey: null, pendingRollover: null });
    } else {
      await db.runAsync(
        'UPDATE transactions SET amount_paise = ?, account_id = ?, updated_at = ? WHERE source_ref = ?',
        after.monthlyIncomePaise,
        after.salaryAccountId ?? CASH_ACCOUNT_ID,
        new Date().toISOString(),
        ref
      );
    }
    transactionRepo.notifyChanged();
    await salaryRepo.sync();
  },

  /** The current cycle with its totals and available balance. */
  async getCurrentCycle(salaryDay: number): Promise<CycleSnapshot> {
    const cycle = cycleContaining(salaryDay);
    const [totals, state] = await Promise.all([cycleTotals(cycle), settingsRepo.get('salaryState')]);
    const balance = calculateCycleBalance({
      carriedInPaise: state.carriedInPaise,
      incomePaise: totals.totalIncomePaise,
      spentPaise: totals.totalExpensePaise,
    });
    return { cycle, totals, balance, state };
  },

  async getSavingsPaise(): Promise<Paise> {
    return (await settingsRepo.get('salaryState')).savingsPaise;
  },
};
