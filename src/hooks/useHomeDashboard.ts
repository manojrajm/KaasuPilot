import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  calculateSafeToSpend,
  OutflowsBreakdown,
  SafeToSpendResult,
} from '@/domain/budget/safeToSpend';
import { calculateLoanHealthScore } from '@/domain/loans/loanHealth';
import { formatPaise } from '@/domain/money/format';
import { Paise } from '@/domain/money/paise';
import { Loan, Transaction } from '@/domain/types';
import { accountRepo } from '@/data/repositories/accountRepo';
import { loanRepo } from '@/data/repositories/loanRepo';
import { settingsRepo } from '@/data/repositories/settingsRepo';
import { MonthlyTotals, transactionRepo } from '@/data/repositories/transactionRepo';
import { DEFAULT_CATEGORIES } from '@/data/seed/defaultCategories';
import {
  dateOnClampedDay,
  daysBetween,
  formatRelativeDateTime,
  formatShortDate,
  nextOccurrenceOfDay,
} from '@/utils/date';

export interface AlertItem {
  id: string;
  title: string;
  subtitle?: string;
  severity: 'warning' | 'alert' | 'info';
  type: 'emi' | 'anomaly' | 'budget';
  amountPaise?: Paise;
}

export interface NextEmiInfo {
  loanId: string;
  loanName: string;
  lender: string;
  emiPaise: Paise;
  dueDate: string;
  daysRemaining: number;
  monthsPaid: number;
  totalMonths: number;
  healthScore: number;
  isPaid: boolean;
}

export interface CashFlowInfo {
  incomePaise: Paise;
  spentPaise: Paise;
  budgetLimitPaise: Paise;
  percentageUsed: number;
}

export interface TransactionItem {
  id: string;
  merchant: string;
  category: string;
  direction: 'debit' | 'credit';
  amountPaise: Paise;
  dateStr: string;
  icon: string;
}

/** How many days ahead an upcoming EMI starts showing as an alert. */
const EMI_ALERT_WINDOW_DAYS = 3;

/** Due date of the loan's next unpaid instalment, following its own schedule. */
function nextDueDateForLoan(loan: Loan): Date {
  const start = new Date(loan.startDate);
  return dateOnClampedDay(
    start.getFullYear(),
    start.getMonth(),
    loan.monthsPaid + 1,
    loan.dueDayOfMonth
  );
}

function toTransactionItem(tx: Transaction): TransactionItem {
  const category = DEFAULT_CATEGORIES.find((c) => c.id === tx.categoryId);
  return {
    id: tx.id,
    merchant: tx.merchant,
    category: category?.name ?? 'Uncategorised',
    direction: tx.direction,
    amountPaise: tx.amountPaise,
    dateStr: formatRelativeDateTime(tx.txnDate),
    icon: category?.emoji ?? '📦',
  };
}

interface DashboardData {
  liquidBalancePaise: Paise;
  monthlyTotals: MonthlyTotals;
  recentTransactions: Transaction[];
  smsPendingCount: number;
  loans: Loan[];
  salaryDay: number;
}

const EMPTY_DATA: DashboardData = {
  liquidBalancePaise: 0,
  monthlyTotals: { totalIncomePaise: 0, totalExpensePaise: 0, count: 0 },
  recentTransactions: [],
  smsPendingCount: 0,
  loans: [],
  salaryDay: 1,
};

async function fetchDashboardData(): Promise<DashboardData> {
  const [liquidBalancePaise, monthlyTotals, recentTransactions, smsPendingCount, loans, salaryDay] =
    await Promise.all([
      accountRepo.getLiquidBalancePaise(),
      transactionRepo.getMonthlyTotals(),
      transactionRepo.getRecent(5),
      transactionRepo.countPendingReview(),
      loanRepo.getAll(),
      settingsRepo.get('salaryDay'),
    ]);
  return { liquidBalancePaise, monthlyTotals, recentTransactions, smsPendingCount, loans, salaryDay };
}

/**
 * Home dashboard use-case. Every figure is derived from on-device data:
 * account balances and monthly totals from the SQLite ledger, EMIs from the loan register.
 * It reloads automatically whenever a transaction, loan or setting changes.
 */
export function useHomeDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Ignore results that arrive after the screen unmounts.
    let active = true;
    const refresh = () => {
      fetchDashboardData()
        .then((next) => {
          if (active) setData(next);
        })
        .catch((error) => console.error('Failed to load dashboard data', error))
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    refresh();
    const unsubscribers = [
      transactionRepo.subscribe(refresh),
      loanRepo.subscribe(refresh),
      settingsRepo.subscribe(refresh),
    ];
    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const { liquidBalancePaise, monthlyTotals, recentTransactions, smsPendingCount, loans, salaryDay } =
    data;

  // Active loans paired with their next due date, soonest first.
  const upcomingEmis = useMemo(() => {
    const today = new Date();
    return loans
      .filter((l) => l.status === 'active' && l.balancePaise > 0)
      .map((loan) => {
        const dueDate = nextDueDateForLoan(loan);
        return { loan, dueDate, daysRemaining: daysBetween(today, dueDate) };
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [loans]);

  const nextIncomeDate = useMemo(() => nextOccurrenceOfDay(salaryDay), [salaryDay]);

  // Committed outflows due before the next salary. Cards, subscriptions and
  // bills are not tracked yet, so they stay at zero rather than showing made-up figures.
  const outflows: OutflowsBreakdown = useMemo(() => {
    const emiPaise = upcomingEmis
      .filter(({ dueDate }) => dueDate.getTime() <= nextIncomeDate.getTime())
      .reduce((sum, { loan }) => sum + loan.emiPaise, 0);
    return { emiPaise, cardDuePaise: 0, subscriptionsPaise: 0, billsPaise: 0 };
  }, [upcomingEmis, nextIncomeDate]);

  const safeToSpend: SafeToSpendResult = useMemo(
    () =>
      calculateSafeToSpend({
        totalBalancesPaise: liquidBalancePaise,
        outflows,
        savingsReservePaise: 0,
        daysUntilNextIncome: daysBetween(new Date(), nextIncomeDate),
      }),
    [liquidBalancePaise, outflows, nextIncomeDate]
  );

  const healthScore = useMemo(
    () =>
      calculateLoanHealthScore(loans, monthlyTotals.totalIncomePaise, liquidBalancePaise).score,
    [loans, monthlyTotals.totalIncomePaise, liquidBalancePaise]
  );

  const nextEmi: NextEmiInfo | null = useMemo(() => {
    const first = upcomingEmis[0];
    if (!first) return null;
    const { loan, dueDate, daysRemaining } = first;
    return {
      loanId: loan.id,
      loanName: loan.name,
      lender: loan.lender,
      emiPaise: loan.emiPaise,
      dueDate: formatShortDate(dueDate),
      daysRemaining,
      monthsPaid: loan.monthsPaid,
      totalMonths: loan.tenureMonths,
      healthScore,
      isPaid: false,
    };
  }, [upcomingEmis, healthScore]);

  // With no budgets configured yet, this month's income is the spending limit.
  const cashFlow: CashFlowInfo = useMemo(() => {
    const income = monthlyTotals.totalIncomePaise;
    const spent = monthlyTotals.totalExpensePaise;
    const percentageUsed = income > 0 ? (spent / income) * 100 : spent > 0 ? 100 : 0;
    return {
      incomePaise: income,
      spentPaise: spent,
      budgetLimitPaise: income,
      percentageUsed,
    };
  }, [monthlyTotals]);

  const alerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [];

    for (const { loan, dueDate, daysRemaining } of upcomingEmis) {
      if (daysRemaining > EMI_ALERT_WINDOW_DAYS) continue;
      const id = `emi_${loan.id}_${loan.monthsPaid + 1}`;
      const when =
        daysRemaining < 0
          ? `overdue by ${-daysRemaining} day${daysRemaining === -1 ? '' : 's'}`
          : daysRemaining === 0
          ? 'due today'
          : `due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
      list.push({
        id,
        title: `${loan.name} EMI ${when}`,
        subtitle: `Keep ${formatPaise(loan.emiPaise)} ready for ${loan.lender} · ${formatShortDate(dueDate)}`,
        severity: daysRemaining < 0 ? 'alert' : 'warning',
        type: 'emi',
        amountPaise: loan.emiPaise,
      });
    }

    const { totalIncomePaise, totalExpensePaise } = monthlyTotals;
    if (totalExpensePaise > totalIncomePaise && totalExpensePaise > 0) {
      const now = new Date();
      list.push({
        id: `overspend_${now.getFullYear()}_${now.getMonth()}`,
        title: 'Spending is above income this month',
        subtitle: `Spent ${formatPaise(totalExpensePaise)} against ${formatPaise(totalIncomePaise)} received`,
        severity: 'alert',
        type: 'budget',
        amountPaise: totalExpensePaise - totalIncomePaise,
      });
    }

    return list.filter((a) => !dismissedAlertIds.has(a.id));
  }, [upcomingEmis, monthlyTotals, dismissedAlertIds]);

  const transactions = useMemo(
    () => recentTransactions.map(toTransactionItem),
    [recentTransactions]
  );

  const dismissAlert = useCallback((id: string) => {
    setDismissedAlertIds((prev) => new Set(prev).add(id));
  }, []);

  /**
   * Pays the next EMI: advances the loan's schedule and records the debit in the ledger,
   * so the balance, monthly spend and safe-to-spend all update together.
   */
  const markEmiPaid = useCallback(async (): Promise<boolean> => {
    const first = upcomingEmis[0];
    if (!first) return false;
    const { loan } = first;
    const instalmentNumber = loan.monthsPaid + 1;

    const updated = await loanRepo.markInstallmentPaid(loan.id);
    if (!updated) return false;

    await transactionRepo.create({
      accountId: loan.accountId,
      amountPaise: loan.emiPaise,
      direction: 'debit',
      categoryId: 'cat_emi',
      merchant: `${loan.name} EMI`,
      note: `Instalment #${instalmentNumber} of ${loan.tenureMonths}`,
      txnDate: new Date().toISOString(),
      source: 'manual',
      status: 'confirmed',
    });
    return true;
  }, [upcomingEmis]);

  const addTransaction = useCallback(
    (data: Omit<Transaction, 'id'>) => transactionRepo.create(data),
    []
  );

  const deleteTransaction = useCallback((id: string) => transactionRepo.delete(id), []);

  return {
    loading,
    safeToSpend,
    outflows,
    alerts,
    dismissAlert,
    nextEmi,
    markEmiPaid,
    cashFlow,
    smsPendingCount,
    transactions,
    recentTransactions,
    addTransaction,
    deleteTransaction,
  };
}
