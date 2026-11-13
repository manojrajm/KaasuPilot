import { Loan, PrepaymentImpact, PrepaymentStrategy } from '@/domain/types';
import { Paise } from '@/domain/money/paise';
import { calculateEmi } from './amortisation';

/**
 * Calculates the exact financial impact of a lump-sum loan prepayment.
 * Supports:
 *  1) 'reduce_tenure': Keeps EMI constant, accelerates debt-free date, maximizes interest saved.
 *  2) 'reduce_emi': Keeps remaining tenure constant, reduces monthly cash outflow.
 */
export function calculatePrepaymentImpact(
  loan: Loan,
  lumpSumPaise: Paise,
  strategy: PrepaymentStrategy
): PrepaymentImpact {
  const currentBalance = loan.balancePaise;
  const remainingMonths = Math.max(1, loan.tenureMonths - loan.monthsPaid);
  const monthlyRate = loan.annualRateBps / (10000 * 12);
  const effectiveBalance = Math.max(0, currentBalance - lumpSumPaise);

  const now = new Date();
  const oldEndDate = new Date(now);
  oldEndDate.setMonth(now.getMonth() + remainingMonths);

  // Baseline remaining interest without prepayment
  let oldRemainingInterest = 0;
  let tempBal = currentBalance;
  for (let m = 0; m < remainingMonths; m++) {
    const interest = Math.round(tempBal * monthlyRate);
    oldRemainingInterest += interest;
    const principal = Math.min(tempBal, loan.emiPaise - interest);
    tempBal = Math.max(0, tempBal - principal);
    if (tempBal <= 0) break;
  }

  if (strategy === 'reduce_tenure') {
    // Keep EMI constant, calculate new months needed
    let newMonths = 0;
    let newTotalInterest = 0;
    let simBal = effectiveBalance;

    while (simBal > 0 && newMonths < remainingMonths * 2) {
      newMonths++;
      const interest = Math.round(simBal * monthlyRate);
      newTotalInterest += interest;
      const principal = Math.min(simBal, loan.emiPaise - interest);
      simBal = Math.max(0, simBal - principal);
    }

    const monthsSaved = Math.max(0, remainingMonths - newMonths);
    const totalInterestSavedPaise = Math.max(0, oldRemainingInterest - newTotalInterest);

    const newEndDate = new Date(now);
    newEndDate.setMonth(now.getMonth() + newMonths);

    return {
      lumpSumPaise,
      strategy: 'reduce_tenure',
      totalInterestSavedPaise,
      monthsSaved,
      newTenureMonths: loan.monthsPaid + newMonths,
      newEmiPaise: loan.emiPaise,
      oldEndDate: oldEndDate.toLocaleDateString([], { month: 'short', year: 'numeric' }),
      newEndDate: newEndDate.toLocaleDateString([], { month: 'short', year: 'numeric' }),
    };
  } else {
    // Reduce EMI: Keep remaining tenure constant, recalculate lower EMI
    const newEmiPaise = calculateEmi(effectiveBalance, loan.annualRateBps, remainingMonths);
    const newTotalRepaid = newEmiPaise * remainingMonths;
    const newTotalInterest = Math.max(0, newTotalRepaid - effectiveBalance);
    const totalInterestSavedPaise = Math.max(0, oldRemainingInterest - newTotalInterest);

    return {
      lumpSumPaise,
      strategy: 'reduce_emi',
      totalInterestSavedPaise,
      monthsSaved: 0,
      newTenureMonths: loan.tenureMonths,
      newEmiPaise,
      oldEndDate: oldEndDate.toLocaleDateString([], { month: 'short', year: 'numeric' }),
      newEndDate: oldEndDate.toLocaleDateString([], { month: 'short', year: 'numeric' }),
    };
  }
}
