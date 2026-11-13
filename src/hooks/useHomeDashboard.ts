import { useState, useCallback } from 'react';
import { calculateSafeToSpend, SafeToSpendResult } from '@/domain/budget/safeToSpend';
import { Paise } from '@/domain/money/paise';

export interface AlertItem {
  id: string;
  title: string;
  subtitle?: string;
  severity: 'warning' | 'alert' | 'info';
  type: 'emi' | 'anomaly' | 'budget';
  amountPaise?: Paise;
}

export interface NextEmiInfo {
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

export function useHomeDashboard() {
  // Safe to Spend State
  const [safeToSpendInput] = useState({
    totalBalancesPaise: 8200000, // ₹ 82,000 total in accounts
    outflows: {
      emiPaise: 1200000,        // ₹ 12,000 EMI
      cardDuePaise: 420000,     // ₹ 4,200 Card
      subscriptionsPaise: 240000,// ₹ 2,400 Subs
      billsPaise: 0,
    },
    savingsReservePaise: 1000000, // ₹ 10,000 Goal Reserve
    daysUntilNextIncome: 9,      // 9 days until salary
  });

  const safeToSpend: SafeToSpendResult = calculateSafeToSpend(safeToSpendInput);

  // Active Alerts
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 'a1',
      title: 'Home loan EMI due in 2 days',
      subtitle: 'Ensure ₹12,000 balance in HDFC Bank',
      severity: 'warning',
      type: 'emi',
      amountPaise: 1200000,
    },
    {
      id: 'a2',
      title: 'Unusual spend: ₹3,450 at XYZ Mart',
      subtitle: '2.8x higher than your grocery average',
      severity: 'alert',
      type: 'anomaly',
      amountPaise: 345000,
    },
  ]);

  // Next EMI Cockpit
  const [nextEmi, setNextEmi] = useState<NextEmiInfo>({
    loanName: 'Car Loan',
    lender: 'HDFC Bank',
    emiPaise: 845000,
    dueDate: '16 Nov',
    daysRemaining: 3,
    monthsPaid: 36,
    totalMonths: 60,
    healthScore: 72,
    isPaid: false,
  });

  // Monthly Budget / Cash Flow
  const cashFlow: CashFlowInfo = {
    incomePaise: 6200000,     // ₹ 62,000
    spentPaise: 3890000,      // ₹ 38,900
    budgetLimitPaise: 6174600,// ₹ 61,746
    percentageUsed: 63,
  };

  // SMS Review Queue
  const [smsPendingCount] = useState(3);

  // Recent Transactions
  const [transactions, setTransactions] = useState<TransactionItem[]>([
    {
      id: 'tx-1',
      merchant: 'Swiggy Gourmet',
      category: 'Food & Dining',
      direction: 'debit',
      amountPaise: 41200,
      dateStr: 'Today, 1:15 PM',
      icon: '🍔',
    },
    {
      id: 'tx-2',
      merchant: 'Salary Credit • ACME Tech',
      category: 'Income',
      direction: 'credit',
      amountPaise: 6200000,
      dateStr: '1 Nov, 9:00 AM',
      icon: '💼',
    },
    {
      id: 'tx-3',
      merchant: 'Shell Mobility Hub',
      category: 'Fuel & Commute',
      direction: 'debit',
      amountPaise: 150000,
      dateStr: 'Yesterday, 6:40 PM',
      icon: '⛽',
    },
    {
      id: 'tx-4',
      merchant: 'Apple Services Sub',
      category: 'Subscriptions',
      direction: 'debit',
      amountPaise: 19900,
      dateStr: '10 Nov',
      icon: '📱',
    },
    {
      id: 'tx-5',
      merchant: 'Amazon Super Value',
      category: 'Groceries',
      direction: 'debit',
      amountPaise: 249000,
      dateStr: '8 Nov',
      icon: '🛍️',
    },
  ]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const markEmiPaid = useCallback(() => {
    setNextEmi((prev) => ({ ...prev, isPaid: true }));
  }, []);

  return {
    safeToSpend,
    outflows: safeToSpendInput.outflows,
    alerts,
    dismissAlert,
    nextEmi,
    markEmiPaid,
    cashFlow,
    smsPendingCount,
    transactions,
  };
}
