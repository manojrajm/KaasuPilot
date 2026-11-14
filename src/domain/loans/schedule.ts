import { Loan } from '@/domain/types';
import { Paise } from '@/domain/money/paise';
import { dateOnClampedDay, startOfLocalDay } from '@/utils/date';

/**
 * Loans store `startDate` as the month before the first EMI, so instalment k (1-based)
 * falls k months after it, on `dueDayOfMonth` (clamped for short months).
 */
export function instalmentDueDate(
  loan: Pick<Loan, 'startDate' | 'dueDayOfMonth'>,
  instalmentNumber: number
): Date {
  const start = new Date(loan.startDate);
  return dateOnClampedDay(start.getFullYear(), start.getMonth(), instalmentNumber, loan.dueDayOfMonth);
}

/** Due date of the next unpaid instalment. */
export function nextDueDate(loan: Pick<Loan, 'startDate' | 'dueDayOfMonth' | 'monthsPaid'>): Date {
  return instalmentDueDate(loan, loan.monthsPaid + 1);
}

/** Which instalment falls in the given calendar month (null if outside the tenure). */
export function instalmentNumberInMonth(
  loan: Pick<Loan, 'startDate' | 'tenureMonths'>,
  year: number,
  monthIndex: number
): number | null {
  const start = new Date(loan.startDate);
  const k = year * 12 + monthIndex - (start.getFullYear() * 12 + start.getMonth());
  return k >= 1 && k <= loan.tenureMonths ? k : null;
}

/** Converts a first-EMI date into the stored `startDate` (one month earlier, local midnight ISO). */
export function startDateFromFirstEmi(firstEmi: Date): string {
  return new Date(firstEmi.getFullYear(), firstEmi.getMonth() - 1, 1).toISOString();
}

/** Number of instalments whose due date is on or before today. */
export function instalmentsDueSoFar(
  loan: Pick<Loan, 'startDate' | 'dueDayOfMonth' | 'tenureMonths'>,
  today: Date = new Date()
): number {
  const t = startOfLocalDay(today).getTime();
  let count = 0;
  while (count < loan.tenureMonths && instalmentDueDate(loan, count + 1).getTime() <= t) {
    count++;
  }
  return count;
}

/** One month of reducing-balance interest on a balance, in whole paise. */
export function monthlyInterest(balancePaise: Paise, annualRateBps: number): Paise {
  return Math.round((balancePaise * annualRateBps) / (10000 * 12));
}

/**
 * Outstanding principal after `paidCount` EMIs on the standard reducing-balance schedule.
 * Stops early if the EMI clears the balance.
 */
export function outstandingAfter(
  principalPaise: Paise,
  annualRateBps: number,
  emiPaise: Paise,
  paidCount: number
): Paise {
  let balance = principalPaise;
  for (let i = 0; i < paidCount && balance > 0; i++) {
    const interest = monthlyInterest(balance, annualRateBps);
    balance = Math.max(0, balance - Math.max(0, emiPaise - interest));
  }
  return balance;
}

/** True when the EMI does not even cover the first month's interest, so the loan never closes. */
export function emiTooLowToRepay(balancePaise: Paise, annualRateBps: number, emiPaise: Paise): boolean {
  return balancePaise > 0 && emiPaise <= monthlyInterest(balancePaise, annualRateBps);
}
