import { Loan } from '@/domain/types';
import { Paise } from '@/domain/money/paise';

export interface LoanHealthBreakdown {
  score: number; // 0 - 100
  tier: 'OPTIMAL' | 'STABLE' | 'ELEVATED' | 'CRITICAL';
  tierColor: string;
  dtiPercent: number;
  dtiScore: number; // Max 40
  emergencyBufferMonths: number;
  bufferScore: number; // Max 25
  disciplineScore: number; // Max 15
  concentrationScore: number; // Max 10
  interestExposureScore: number; // Max 10
  recommendations: string[];
}

export function calculateLoanHealthScore(
  loans: Loan[],
  monthlyIncomePaise: Paise,
  liquidSavingsPaise: Paise
): LoanHealthBreakdown {
  const activeLoans = loans.filter((l) => l.status === 'active' && l.balancePaise > 0);
  const totalMonthlyEmi = activeLoans.reduce((sum, l) => sum + l.emiPaise, 0);
  const totalBalance = activeLoans.reduce((sum, l) => sum + l.balancePaise, 0);

  // 1. Debt-to-Income (DTI) Score (Max 40)
  const dtiPercent = monthlyIncomePaise > 0
    ? Math.round((totalMonthlyEmi / monthlyIncomePaise) * 100)
    : 0;

  let dtiScore = 40;
  if (dtiPercent <= 25) dtiScore = 40;
  else if (dtiPercent <= 35) dtiScore = 32;
  else if (dtiPercent <= 45) dtiScore = 20;
  else if (dtiPercent <= 55) dtiScore = 10;
  else dtiScore = 5;

  // 2. Emergency Buffer Score (Max 25)
  const bufferMonths = totalMonthlyEmi > 0
    ? Math.round((liquidSavingsPaise / totalMonthlyEmi) * 10) / 10
    : 12;

  let bufferScore = 25;
  if (bufferMonths >= 6) bufferScore = 25;
  else if (bufferMonths >= 4) bufferScore = 20;
  else if (bufferMonths >= 2.5) bufferScore = 14;
  else if (bufferMonths >= 1) bufferScore = 8;
  else bufferScore = 2;

  // 3. Payment Discipline (Max 15)
  const avgMonthsPaid = activeLoans.length > 0
    ? activeLoans.reduce((sum, l) => sum + l.monthsPaid, 0) / activeLoans.length
    : 12;
  let disciplineScore = 15;
  if (avgMonthsPaid >= 12) disciplineScore = 15;
  else if (avgMonthsPaid >= 6) disciplineScore = 12;
  else disciplineScore = 8;

  // 4. Concentration Risk (Max 10)
  let concentrationScore = 10;
  if (activeLoans.length > 1 && totalBalance > 0) {
    const highestSingle = Math.max(...activeLoans.map((l) => l.balancePaise));
    const ratio = highestSingle / totalBalance;
    if (ratio > 0.8) concentrationScore = 4;
    else if (ratio > 0.65) concentrationScore = 7;
    else concentrationScore = 10;
  }

  // 5. High-Interest Exposure (> 14% p.a.) (Max 10)
  let interestExposureScore = 10;
  const highInterestLoans = activeLoans.filter((l) => l.annualRateBps > 1400);
  if (highInterestLoans.length > 0) {
    interestExposureScore = 3;
  }

  const finalScore = Math.min(
    100,
    Math.max(
      0,
      dtiScore + bufferScore + disciplineScore + concentrationScore + interestExposureScore
    )
  );

  let tier: 'OPTIMAL' | 'STABLE' | 'ELEVATED' | 'CRITICAL' = 'OPTIMAL';
  let tierColor = '#00E676'; // Electric Emerald

  if (finalScore >= 80) {
    tier = 'OPTIMAL';
    tierColor = '#00E676';
  } else if (finalScore >= 65) {
    tier = 'STABLE';
    tierColor = '#00F0FF'; // Cyber Cyan
  } else if (finalScore >= 45) {
    tier = 'ELEVATED';
    tierColor = '#FFB800'; // Amber Gold
  } else {
    tier = 'CRITICAL';
    tierColor = '#FF3B30'; // Alert Crimson
  }

  const recommendations: string[] = [];
  if (dtiPercent > 35) {
    recommendations.push(`DTI ratio is ${dtiPercent}% (Ideal is under 30%). Consider prepaying high-EMI loans.`);
  }
  if (bufferMonths < 3) {
    recommendations.push(`Emergency buffer is only ${bufferMonths} months. Aim for at least 3 to 6 months of EMI in liquid accounts.`);
  }
  if (highInterestLoans.length > 0) {
    recommendations.push(`You have loans exceeding 14% p.a. Use the Avalanche strategy to prioritize paying them first.`);
  }

  return {
    score: finalScore,
    tier,
    tierColor,
    dtiPercent,
    dtiScore,
    emergencyBufferMonths: bufferMonths,
    bufferScore,
    disciplineScore,
    concentrationScore,
    interestExposureScore,
    recommendations,
  };
}
