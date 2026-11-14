import { DueCalendarEvent, Loan } from '@/domain/types';
import { instalmentDueDate, instalmentNumberInMonth } from './schedule';

/**
 * Calendar events for one month, derived from each loan's own schedule:
 * an instalment is shown as paid when it is within the loan's `monthsPaid`.
 */
export function buildDueEvents(loans: Loan[], year: number, monthIndex: number): DueCalendarEvent[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const events: DueCalendarEvent[] = [];

  for (const loan of loans) {
    const k = instalmentNumberInMonth(loan, year, monthIndex);
    if (k === null) continue;
    // Skip future instalments of a loan that has already been closed.
    if (loan.status === 'closed' && k > loan.monthsPaid) continue;
    const due = instalmentDueDate(loan, k);
    events.push({
      id: `due_${loan.id}_${k}`,
      title: loan.name,
      amountPaise: loan.emiPaise,
      dueDate: `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`,
      dayOfMonth: due.getDate(),
      type: 'loan_emi',
      sourceId: loan.id,
      lenderOrMerchant: loan.lender,
      status: k <= loan.monthsPaid ? 'paid' : 'pending',
    });
  }

  return events.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
}

/** Instalment number encoded in an event id ("due_<loanId>_<k>"). */
export function instalmentFromEventId(eventId: string): number | null {
  const match = /_(\d+)$/.exec(eventId);
  return match ? Number(match[1]) : null;
}
