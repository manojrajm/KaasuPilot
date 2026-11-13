import { Paise } from '../money/paise';

export interface OutflowsBreakdown {
  emiPaise: Paise;
  cardDuePaise: Paise;
  subscriptionsPaise: Paise;
  billsPaise: Paise;
}

export interface SafeToSpendInput {
  totalBalancesPaise: Paise;
  outflows: OutflowsBreakdown;
  savingsReservePaise: Paise;
  daysUntilNextIncome: number;
}

export interface SafeToSpendResult {
  safeToSpendTodayPaise: Paise;
  availablePaise: Paise;
  totalCommittedPaise: Paise;
  daysUntilNextIncome: number;
  isNegative: boolean;
  statusLevel: 'healthy' | 'caution' | 'critical';
}

/**
 * Pure calculation engine for Safe to Spend Today (Architecture §5.6)
 */
export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendResult {
  const { totalBalancesPaise, outflows, savingsReservePaise, daysUntilNextIncome } = input;

  const totalCommittedPaise =
    outflows.emiPaise +
    outflows.cardDuePaise +
    outflows.subscriptionsPaise +
    outflows.billsPaise;

  const availablePaise = totalBalancesPaise - totalCommittedPaise - savingsReservePaise;
  const safeDays = Math.max(1, daysUntilNextIncome);

  const safeToSpendTodayPaise = Math.max(0, Math.floor(availablePaise / safeDays));
  const isNegative = availablePaise < 0;

  let statusLevel: 'healthy' | 'caution' | 'critical' = 'healthy';
  if (isNegative || safeToSpendTodayPaise === 0) {
    statusLevel = 'critical';
  } else if (safeToSpendTodayPaise < 50000) {
    // Less than ₹500/day
    statusLevel = 'caution';
  }

  return {
    safeToSpendTodayPaise,
    availablePaise,
    totalCommittedPaise,
    daysUntilNextIncome: safeDays,
    isNegative,
    statusLevel,
  };
}
