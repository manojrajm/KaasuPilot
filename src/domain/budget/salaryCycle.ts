import { Paise } from '@/domain/money/paise';
import { dateOnClampedDay, startOfLocalDay } from '@/utils/date';

/** One salary period: from a salary date up to (not including) the next one. */
export interface SalaryCycle {
  /** Local midnight of the salary date that opened this cycle. */
  start: Date;
  /** Local midnight of the next salary date. */
  end: Date;
  /** Stable key "YYYY-MM-DD" of `start`, used for de-duplication. */
  key: string;
}

function dateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function cycleStartingInMonth(year: number, monthIndex: number, salaryDay: number): SalaryCycle {
  const start = dateOnClampedDay(year, monthIndex, 0, salaryDay);
  const end = dateOnClampedDay(year, monthIndex, 1, salaryDay);
  return { start, end, key: dateKey(start) };
}

/** The cycle that contains `date`. A salary day of 31 means the last day of short months. */
export function cycleContaining(salaryDay: number, date: Date = new Date()): SalaryCycle {
  const day = startOfLocalDay(date);
  const thisMonth = cycleStartingInMonth(day.getFullYear(), day.getMonth(), salaryDay);
  if (day.getTime() >= thisMonth.start.getTime()) return thisMonth;
  return cycleStartingInMonth(day.getFullYear(), day.getMonth() - 1, salaryDay);
}

/** The cycle immediately after `cycle`. */
export function nextCycle(cycle: SalaryCycle, salaryDay: number): SalaryCycle {
  return cycleStartingInMonth(cycle.start.getFullYear(), cycle.start.getMonth() + 1, salaryDay);
}

/** Parses a cycle key back into the cycle it identifies. */
export function cycleFromKey(key: string, salaryDay: number): SalaryCycle {
  const [y, m] = key.split('-').map(Number);
  return cycleStartingInMonth(y, m - 1, salaryDay);
}

/**
 * Cycles that started after `lastKey` up to and including the current one, oldest first.
 * Used to catch up when the app was not opened for one or more salary dates.
 */
export function cyclesSince(lastKey: string, salaryDay: number, today: Date = new Date()): SalaryCycle[] {
  const current = cycleContaining(salaryDay, today);
  const result: SalaryCycle[] = [];
  let cycle = nextCycle(cycleFromKey(lastKey, salaryDay), salaryDay);
  // Cap the catch-up so a corrupted key can never loop for long.
  for (let i = 0; i < 120 && cycle.start.getTime() <= current.start.getTime(); i++) {
    result.push(cycle);
    cycle = nextCycle(cycle, salaryDay);
  }
  return result;
}

export interface CycleBalanceInput {
  /** Balance carried in from the previous cycle (0 if it went to savings). */
  carriedInPaise: Paise;
  /** All confirmed credits in the cycle, including the automatic salary entry. */
  incomePaise: Paise;
  /** All confirmed debits in the cycle. */
  spentPaise: Paise;
}

export interface CycleBalance {
  availablePaise: Paise;
  /** Total money for the cycle: carried + income. */
  fundsPaise: Paise;
  /** Share of funds already spent, 0–100 (100 when overspent). */
  usedPercent: number;
  isOverspent: boolean;
}

/** Available balance for a cycle = carried in + income − spent. */
export function calculateCycleBalance(input: CycleBalanceInput): CycleBalance {
  const fundsPaise = input.carriedInPaise + input.incomePaise;
  const availablePaise = fundsPaise - input.spentPaise;
  const usedPercent =
    fundsPaise > 0 ? Math.min(100, (input.spentPaise / fundsPaise) * 100) : input.spentPaise > 0 ? 100 : 0;
  return { availablePaise, fundsPaise, usedPercent, isOverspent: availablePaise < 0 };
}
