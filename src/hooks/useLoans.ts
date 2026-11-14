import { useCallback, useEffect, useMemo, useState } from 'react';

import { accountRepo } from '@/data/repositories/accountRepo';
import { loanRepo, PayResult } from '@/data/repositories/loanRepo';
import { profileRepo } from '@/data/repositories/profileRepo';
import { buildDueEvents } from '@/domain/loans/dueEvents';
import { calculateLoanHealthScore, LoanHealthBreakdown } from '@/domain/loans/loanHealth';
import { DueCalendarEvent, Loan, PrepaymentStrategy } from '@/domain/types';

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyIncomePaise, setMonthlyIncomePaise] = useState(0);
  const [liquidBalancePaise, setLiquidBalancePaise] = useState(0);

  // Calendar View Month Navigation (Default current date)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [allLoans, profile, liquid] = await Promise.all([
          loanRepo.getAll(),
          profileRepo.getProfile(),
          accountRepo.getLiquidBalancePaise(),
        ]);
        if (active) {
          setLoans(allLoans);
          setMonthlyIncomePaise(profile.monthlyIncomePaise);
          setLiquidBalancePaise(liquid);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load loans telemetry', err);
        if (active) setLoading(false);
      }
    };

    load();
    const unsubLoans = loanRepo.subscribe(load);
    const unsubAccounts = accountRepo.subscribe(load);
    const unsubProfile = profileRepo.subscribe(load);

    return () => {
      active = false;
      unsubLoans();
      unsubAccounts();
      unsubProfile();
    };
  }, []);

  // Due Dates Calendar Events for selected month
  const calendarEvents: DueCalendarEvent[] = useMemo(() => {
    return buildDueEvents(loans, selectedYear, selectedMonthIndex);
  }, [loans, selectedYear, selectedMonthIndex]);

  // Aggregate health breakdown with real profile & liquid data
  const healthBreakdown: LoanHealthBreakdown = useMemo(() => {
    return calculateLoanHealthScore(loans, monthlyIncomePaise, liquidBalancePaise);
  }, [loans, monthlyIncomePaise, liquidBalancePaise]);

  // Month navigation helpers
  const goToNextMonth = useCallback(() => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonthIndex((m) => m + 1);
    }
  }, [selectedMonthIndex]);

  const goToPrevMonth = useCallback(() => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonthIndex((m) => m - 1);
    }
  }, [selectedMonthIndex]);

  const markPaid = useCallback(async (loanId: string): Promise<PayResult> => {
    return loanRepo.payNextEmi(loanId);
  }, []);

  const recordPrepayment = useCallback(
    async (loanId: string, lumpSumPaise: number, strategy: PrepaymentStrategy) => {
      await loanRepo.recordPrepayment(loanId, lumpSumPaise, strategy);
    },
    []
  );

  return {
    loans,
    loading,
    healthBreakdown,
    calendarEvents,
    selectedYear,
    selectedMonthIndex,
    goToNextMonth,
    goToPrevMonth,
    markPaid,
    recordPrepayment,
  };
}