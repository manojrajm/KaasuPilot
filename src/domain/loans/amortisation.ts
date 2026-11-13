import { Loan, LoanAmortisationEntry } from '@/domain/types';
import { Paise } from '@/domain/money/paise';

/**
 * Calculates monthly EMI in integer Paise using the standard reducing-balance formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param principalPaise Principal amount in Paise
 * @param annualRateBps Annual interest rate in Basis Points (e.g., 850 = 8.50%)
 * @param tenureMonths Tenure in months
 * @returns Monthly EMI in Paise (rounded to integer)
 */
export function calculateEmi(
  principalPaise: Paise,
  annualRateBps: number,
  tenureMonths: number
): Paise {
  if (tenureMonths <= 0 || principalPaise <= 0) return 0;
  if (annualRateBps <= 0) {
    return Math.round(principalPaise / tenureMonths);
  }

  // Monthly interest rate = (annualRateBps / 10,000) / 12
  const monthlyRate = annualRateBps / (10000 * 12);
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emiFloat = (principalPaise * monthlyRate * factor) / (factor - 1);

  return Math.round(emiFloat);
}

/**
 * Generates full month-by-month amortisation schedule for a loan.
 * Applies final-installment rounding absorption so the ending balance is precisely 0.
 */
export function generateAmortisationSchedule(loan: Loan): LoanAmortisationEntry[] {
  const schedule: LoanAmortisationEntry[] = [];
  let remainingBalance = loan.principalPaise;
  const monthlyRate = loan.annualRateBps / (10000 * 12);
  const startDate = new Date(loan.startDate);

  for (let i = 1; i <= loan.tenureMonths; i++) {
    // Interest component for this month
    const interestComponent = Math.round(remainingBalance * monthlyRate);

    // Principal component is EMI minus interest
    let principalComponent = loan.emiPaise - interestComponent;

    // Handle last installment or over-amortisation
    if (i === loan.tenureMonths || principalComponent >= remainingBalance) {
      principalComponent = remainingBalance;
      remainingBalance = 0;
    } else {
      remainingBalance -= principalComponent;
    }

    // Due date on the specific due day of month
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + i);
    dueDate.setDate(loan.dueDayOfMonth);

    schedule.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString(),
      principalComponentPaise: principalComponent,
      interestComponentPaise: interestComponent,
      remainingBalancePaise: remainingBalance,
      status: i <= loan.monthsPaid ? 'paid' : i === loan.monthsPaid + 1 ? 'pending' : 'pending',
    });

    if (remainingBalance <= 0) break;
  }

  return schedule;
}
