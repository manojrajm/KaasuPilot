import { Loan, DueCalendarEvent, PrepaymentStrategy } from '@/domain/types';
import { calculatePrepaymentImpact } from '@/domain/loans/prepayment';

// Pre-seeded loans stored strictly on the local device
let localLoansStore: Loan[] = [
  {
    id: 'loan_hdfc_home',
    name: 'HDFC Home Loan',
    type: 'home',
    lender: 'HDFC Bank',
    principalPaise: 320000000, // ₹ 32,00,000
    balancePaise: 284000000,   // ₹ 28,40,000
    annualRateBps: 850,        // 8.50% p.a.
    tenureMonths: 240,         // 20 years
    monthsPaid: 38,
    startDate: '2023-09-01T00:00:00.000Z',
    emiPaise: 2776400,         // ₹ 27,764 / month
    dueDayOfMonth: 25,
    accountId: 'acc_hdfc',
    status: 'active',
    prepaymentsPaise: 15000000,// ₹ 1,50,000 prepaid previously
  },
  {
    id: 'loan_auto_nexon',
    name: 'Tata Nexon Auto Loan',
    type: 'auto',
    lender: 'HDFC Bank',
    principalPaise: 65000000,  // ₹ 6,50,000
    balancePaise: 42000000,    // ₹ 4,20,000
    annualRateBps: 910,        // 9.10% p.a.
    tenureMonths: 60,          // 5 years
    monthsPaid: 28,
    startDate: '2024-07-15T00:00:00.000Z',
    emiPaise: 845000,          // ₹ 8,450 / month
    dueDayOfMonth: 16,
    accountId: 'acc_hdfc',
    status: 'active',
  },
];

// Tracking calendar dues state (paid vs pending for current cycle)
const paidEventIds = new Set<string>();

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
    return [...localLoansStore];
  },

  async getById(id: string): Promise<Loan | undefined> {
    return localLoansStore.find((l) => l.id === id);
  },

  async create(loan: Omit<Loan, 'id'>): Promise<Loan> {
    const newLoan: Loan = {
      ...loan,
      id: `loan_${Date.now()}`,
    };
    localLoansStore.push(newLoan);
    notify();
    return newLoan;
  },

  async markInstallmentPaid(loanId: string): Promise<boolean> {
    const loan = localLoansStore.find((l) => l.id === loanId);
    if (!loan) return false;

    // Monthly principal reduction
    const monthlyRate = loan.annualRateBps / (10000 * 12);
    const interest = Math.round(loan.balancePaise * monthlyRate);
    const principalComponent = Math.min(loan.balancePaise, loan.emiPaise - interest);

    loan.balancePaise = Math.max(0, loan.balancePaise - principalComponent);
    loan.monthsPaid += 1;
    if (loan.balancePaise <= 0) {
      loan.status = 'closed';
    }

    notify();
    return true;
  },

  async recordPrepayment(
    loanId: string,
    lumpSumPaise: number,
    strategy: PrepaymentStrategy
  ): Promise<boolean> {
    const loan = localLoansStore.find((l) => l.id === loanId);
    if (!loan) return false;

    const impact = calculatePrepaymentImpact(loan, lumpSumPaise, strategy);

    loan.balancePaise = Math.max(0, loan.balancePaise - lumpSumPaise);
    loan.prepaymentsPaise = (loan.prepaymentsPaise || 0) + lumpSumPaise;

    if (strategy === 'reduce_tenure') {
      loan.tenureMonths = impact.newTenureMonths;
    } else {
      loan.emiPaise = impact.newEmiPaise;
    }

    if (loan.balancePaise <= 0) {
      loan.status = 'closed';
    }

    notify();
    return true;
  },

  /**
   * Generates calendar events for a specific month and year.
   * Includes Loan EMIs and Credit Card statements.
   */
  getCalendarEvents(year: number, monthIndex: number): DueCalendarEvent[] {
    const events: DueCalendarEvent[] = [];
    const pad = (n: number) => String(n).padStart(2, '0');

    // 1. Add active loans
    localLoansStore
      .filter((l) => l.status === 'active' && l.balancePaise > 0)
      .forEach((loan) => {
        const eventId = `due_${loan.id}_${year}_${monthIndex}_${loan.dueDayOfMonth}`;
        const isPaid = paidEventIds.has(eventId);

        events.push({
          id: eventId,
          title: loan.name,
          amountPaise: loan.emiPaise,
          dueDate: `${year}-${pad(monthIndex + 1)}-${pad(loan.dueDayOfMonth)}`,
          dayOfMonth: loan.dueDayOfMonth,
          type: 'loan_emi',
          sourceId: loan.id,
          lenderOrMerchant: loan.lender,
          status: isPaid ? 'paid' : 'pending',
        });
      });

    // 2. Add Credit Card Statement Due (20th of the month)
    const cardEventId = `due_card_regalia_${year}_${monthIndex}_20`;
    events.push({
      id: cardEventId,
      title: 'Regalia Gold Card Statement',
      amountPaise: 420000, // ₹ 4,200
      dueDate: `${year}-${pad(monthIndex + 1)}-20`,
      dayOfMonth: 20,
      type: 'credit_card',
      sourceId: 'acc_card',
      lenderOrMerchant: 'HDFC Credit Cards',
      status: paidEventIds.has(cardEventId) ? 'paid' : 'pending',
    });

    events.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
    return events;
  },

  markCalendarEventPaid(eventId: string): void {
    paidEventIds.add(eventId);
    notify();
  },
};
