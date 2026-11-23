import { useCallback, useEffect, useMemo, useState } from 'react';

import { accountRepo } from '@/data/repositories/accountRepo';
import { categoryRepo } from '@/data/repositories/categoryRepo';
import { loanRepo, PayResult } from '@/data/repositories/loanRepo';
import { profileRepo } from '@/data/repositories/profileRepo';
import { CycleSnapshot, salaryRepo } from '@/data/repositories/salaryRepo';
import { settingsRepo } from '@/data/repositories/settingsRepo';
import { transactionRepo } from '@/data/repositories/transactionRepo';
import { DEFAULT_CATEGORIES } from '@/data/seed/defaultCategories';
import { calculateSpendingVelocity, SpendingVelocityTelemetry } from '@/domain/budget/spendingVelocity';
import { calculateLoanHealthScore } from '@/domain/loans/loanHealth';
import { nextDueDate } from '@/domain/loans/schedule';
import { formatPaise } from '@/domain/money/format';
import { Paise } from '@/domain/money/paise';
import { DEFAULT_PROFILE, SalaryState, UserProfile } from '@/domain/profile/types';
import { Account, Category, Loan, Transaction } from '@/domain/types';
import {
  daysBetween,
  formatRelativeDateTime,
  formatShortDate,
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
  dueDateObj: Date;
  daysRemaining: number;
  monthsPaid: number;
  totalMonths: number;
  healthScore: number;
  isPaid: boolean;
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

const EMI_ALERT_WINDOW_DAYS = 3;

function toTransactionItem(
  tx: Transaction,
  categoriesMap: Record<string, Category>
): TransactionItem {
  const category =
    categoriesMap[tx.categoryId] ||
    DEFAULT_CATEGORIES.find((c) => c.id === tx.categoryId);
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

export function useHomeDashboard() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [cycleSnapshot, setCycleSnapshot] = useState<CycleSnapshot | null>(null);
  const [salaryCard, setSalaryCard] = useState<Account | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [smsPendingCount, setSmsPendingCount] = useState<number>(0);
  const [pendingSmsTransactions, setPendingSmsTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [savingsPaise, setSavingsPaise] = useState<Paise>(0);
  const [categoriesMap, setCategoriesMap] = useState<Record<string, Category>>({});
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        await salaryRepo.sync();

        const [p, loansData, txns, pendingReview, pendingList, savings, catList] = await Promise.all([
          profileRepo.getProfile(),
          loanRepo.getAll(),
          transactionRepo.getRecent(5),
          transactionRepo.countPendingReview(),
          transactionRepo.getPendingReview(),
          salaryRepo.getSavingsPaise(),
          categoryRepo.getAll({ includeArchived: true }),
        ]);

        const [cycle, card] = await Promise.all([
          salaryRepo.getCurrentCycle(p.salaryDayOfMonth),
          p.salaryAccountId ? accountRepo.getById(p.salaryAccountId) : Promise.resolve(null),
        ]);

        if (active) {
          const map: Record<string, Category> = {};
          for (const c of catList) {
            map[c.id] = c;
          }
          setCategoriesMap(map);
          setProfile(p);
          setLoans(loansData);
          setRecentTransactions(txns);
          setSmsPendingCount(pendingReview);
          setPendingSmsTransactions(pendingList);
          setSavingsPaise(savings);
          setCycleSnapshot(cycle);
          setSalaryCard(card ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load home dashboard telemetry', err);
        if (active) setLoading(false);
      }
    };

    loadData();

    const unsubTransactions = transactionRepo.subscribe(loadData);
    const unsubLoans = loanRepo.subscribe(loadData);
    const unsubSettings = settingsRepo.subscribe(loadData);
    const unsubAccounts = accountRepo.subscribe(loadData);
    const unsubCategories = categoryRepo.subscribe(loadData);

    return () => {
      active = false;
      unsubTransactions();
      unsubLoans();
      unsubSettings();
      unsubAccounts();
      unsubCategories();
    };
  }, []);

  // Upcoming EMIs
  const upcomingEmis = useMemo(() => {
    const today = new Date();
    return loans
      .filter((l) => l.status === 'active' && l.balancePaise > 0)
      .map((loan) => {
        const due = nextDueDate(loan);
        return { loan, dueDate: due, daysRemaining: daysBetween(today, due) };
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [loans]);

  // Overall loan health
  const healthScore = useMemo(() => {
    const liquid = cycleSnapshot?.balance.availablePaise ?? 0;
    return calculateLoanHealthScore(loans, profile.monthlyIncomePaise, Math.max(0, liquid)).score;
  }, [loans, profile.monthlyIncomePaise, cycleSnapshot]);

  // Next soonest EMI
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
      dueDateObj: dueDate,
      daysRemaining,
      monthsPaid: loan.monthsPaid,
      totalMonths: loan.tenureMonths,
      healthScore,
      isPaid: false,
    };
  }, [upcomingEmis, healthScore]);

  // Derived Cycle Telemetry
  const availablePaise = cycleSnapshot?.balance.availablePaise ?? 0;
  const isOverspent = cycleSnapshot?.balance.isOverspent ?? false;
  const usedPercent = cycleSnapshot?.balance.usedPercent ?? 0;
  const salaryPaise = profile.monthlyIncomePaise;
  const totalIncomePaise = cycleSnapshot?.totals.totalIncomePaise ?? 0;
  const extraIncomePaise = Math.max(0, totalIncomePaise - salaryPaise);
  const spentPaise = cycleSnapshot?.totals.totalExpensePaise ?? 0;
  const carriedInPaise = cycleSnapshot?.state.carriedInPaise ?? 0;
  const pendingRollover = cycleSnapshot?.state.pendingRollover ?? null;

  const daysToNextSalary = useMemo(() => {
    if (!cycleSnapshot) return 0;
    return Math.max(0, daysBetween(new Date(), cycleSnapshot.cycle.end));
  }, [cycleSnapshot]);

  // Alerts
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

    if (isOverspent) {
      const now = new Date();
      list.push({
        id: `overspend_${now.getFullYear()}_${now.getMonth()}`,
        title: 'Cycle Available Balance Depleted',
        subtitle: `Expenses (${formatPaise(spentPaise)}) have exceeded available cycle funds (${formatPaise(totalIncomePaise + carriedInPaise)})`,
        severity: 'alert',
        type: 'budget',
        amountPaise: Math.abs(availablePaise),
      });
    }

    return list.filter((a) => !dismissedAlertIds.has(a.id));
  }, [upcomingEmis, isOverspent, spentPaise, totalIncomePaise, carriedInPaise, availablePaise, dismissedAlertIds]);

  const transactions = useMemo(
    () => recentTransactions.map((tx) => toTransactionItem(tx, categoriesMap)),
    [recentTransactions, categoriesMap]
  );

  const dismissAlert = useCallback((id: string) => {
    setDismissedAlertIds((prev) => new Set(prev).add(id));
  }, []);

  const resolveRollover = useCallback(async (choice: 'carry' | 'savings') => {
    await salaryRepo.resolveRollover(choice);
    // Reload cycle snapshot
    const p = await profileRepo.getProfile();
    const cycle = await salaryRepo.getCurrentCycle(p.salaryDayOfMonth);
    const savings = await salaryRepo.getSavingsPaise();
    setCycleSnapshot(cycle);
    setSavingsPaise(savings);
  }, []);

  const markEmiPaid = useCallback(async (): Promise<PayResult> => {
    const first = upcomingEmis[0];
    if (!first) return { ok: false, reason: 'No active upcoming EMI found' };
    return loanRepo.payNextEmi(first.loan.id);
  }, [upcomingEmis]);

  const addTransaction = useCallback(
    (data: Omit<Transaction, 'id'>) => transactionRepo.create(data),
    []
  );

  const deleteTransaction = useCallback((id: string) => transactionRepo.delete(id), []);

  const spendingVelocity = useMemo(() => {
    if (!cycleSnapshot) return null;
    return calculateSpendingVelocity({
      cycleStart: cycleSnapshot.cycle.start,
      cycleEnd: cycleSnapshot.cycle.end,
      spentPaise,
      availablePaise,
    });
  }, [cycleSnapshot, spentPaise, availablePaise]);

  const approveSms = useCallback(
    async (
      id: string,
      updates?: Partial<Pick<Transaction, 'categoryId' | 'merchant' | 'accountId'>>
    ) => {
      await transactionRepo.approve(id, updates);
    },
    []
  );

  const dismissSms = useCallback(async (id: string) => {
    await transactionRepo.dismiss(id);
  }, []);

  return {
    loading,
    profile,
    salaryCard,
    cycle: cycleSnapshot?.cycle ?? null,
    availablePaise,
    salaryPaise,
    extraIncomePaise,
    spentPaise,
    carriedInPaise,
    usedPercent,
    isOverspent,
    daysToNextSalary,
    pendingRollover,
    savingsPaise,
    resolveRollover,
    nextEmi,
    alerts,
    dismissAlert,
    markEmiPaid,
    transactions,
    recentTransactions,
    addTransaction,
    deleteTransaction,
    smsPendingCount,
    pendingSmsTransactions,
    spendingVelocity,
    approveSms,
    dismissSms,
  };
}