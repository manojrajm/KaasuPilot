import { Loan } from '@/domain/types';
import { Paise } from '@/domain/money/paise';

export interface PayoffStrategyResult {
  strategy: 'snowball' | 'avalanche';
  totalMonthsToPayoff: number;
  totalInterestPaidPaise: Paise;
  monthlyOrder: Array<{
    loanId: string;
    loanName: string;
    payoffMonth: number;
  }>;
}

/**
 * Simulates debt payoff across multiple loans with an extra monthly budget
 * comparing Snowball (smallest balance first) vs Avalanche (highest interest first).
 */
export function simulateDebtPayoff(
  loans: Loan[],
  extraMonthlyPaise: Paise = 0
): {
  snowball: PayoffStrategyResult;
  avalanche: PayoffStrategyResult;
  interestSavedWithAvalanchePaise: Paise;
  monthsDifference: number;
} {
  const activeLoans = loans.filter((l) => l.status === 'active' && l.balancePaise > 0);

  const runSimulation = (
    strategy: 'snowball' | 'avalanche'
  ): PayoffStrategyResult => {
    // Clone balances
    const loanStates = activeLoans.map((l) => ({
      loanId: l.id,
      loanName: l.name,
      balance: l.balancePaise,
      rateBps: l.annualRateBps,
      emi: l.emiPaise,
      payoffMonth: 0,
    }));

    // Sorting criteria
    if (strategy === 'snowball') {
      loanStates.sort((a, b) => a.balance - b.balance);
    } else {
      loanStates.sort((a, b) => b.rateBps - a.rateBps);
    }

    let month = 0;
    let totalInterest = 0;
    const maxMonths = 360; // 30 years cap

    while (loanStates.some((l) => l.balance > 0) && month < maxMonths) {
      month++;
      let extraSnowball = extraMonthlyPaise;

      // 1. Accrue interest & pay minimum EMI on each
      for (const l of loanStates) {
        if (l.balance <= 0) {
          // If already paid off, roll its regular EMI into the extra snowball bucket
          extraSnowball += l.emi;
          continue;
        }

        const monthlyRate = l.rateBps / (10000 * 12);
        const interest = Math.round(l.balance * monthlyRate);
        totalInterest += interest;
        l.balance += interest;

        const payment = Math.min(l.balance, l.emi);
        l.balance -= payment;

        if (l.balance <= 0 && l.payoffMonth === 0) {
          l.payoffMonth = month;
        }
      }

      // 2. Direct all extra snowball funds to the top active priority loan
      for (const l of loanStates) {
        if (l.balance > 0 && extraSnowball > 0) {
          const extraPay = Math.min(l.balance, extraSnowball);
          l.balance -= extraPay;
          extraSnowball -= extraPay;

          if (l.balance <= 0 && l.payoffMonth === 0) {
            l.payoffMonth = month;
          }
        }
      }
    }

    return {
      strategy,
      totalMonthsToPayoff: month,
      totalInterestPaidPaise: totalInterest,
      monthlyOrder: loanStates.map((l) => ({
        loanId: l.loanId,
        loanName: l.loanName,
        payoffMonth: l.payoffMonth || month,
      })),
    };
  };

  const snowball = runSimulation('snowball');
  const avalanche = runSimulation('avalanche');
  const interestSaved = Math.max(
    0,
    snowball.totalInterestPaidPaise - avalanche.totalInterestPaidPaise
  );
  const monthsDiff = Math.max(
    0,
    snowball.totalMonthsToPayoff - avalanche.totalMonthsToPayoff
  );

  return {
    snowball,
    avalanche,
    interestSavedWithAvalanchePaise: interestSaved,
    monthsDifference: monthsDiff,
  };
}
