import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loan, DueCalendarEvent, PrepaymentStrategy } from '@/domain/types';
import { loanRepo } from '@/data/repositories/loanRepo';
import { calculateLoanHealthScore, LoanHealthBreakdown } from '@/domain/loans/loanHealth';

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar View Month Navigation (Default current date)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(now.getMonth());

  const fetchLoans = useCallback(async () => {
    const list = await loanRepo.getAll();
    setLoans(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLoans();
    const unsubscribe = loanRepo.subscribe(() => {
      fetchLoans();
    });
    return unsubscribe;
  }, [fetchLoans]);

  // Aggregate monthly income (₹62,000) and liquid savings (₹82,000) for health scoring
  const healthBreakdown: LoanHealthBreakdown = useMemo(() => {
    return calculateLoanHealthScore(loans, 6200000, 8200000);
  }, [loans]);

  // Due Dates Calendar Events for selected month
  const calendarEvents = useMemo(() => {
    return loanRepo.getCalendarEvents(selectedYear, selectedMonthIndex);
  }, [selectedYear, selectedMonthIndex, loans]);

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

  const markPaid = useCallback(async (loanId: string) => {
    await loanRepo.markInstallmentPaid(loanId);
  }, []);

  const recordPrepayment = useCallback(
    async (loanId: string, lumpSumPaise: number, strategy: PrepaymentStrategy) => {
      await loanRepo.recordPrepayment(loanId, lumpSumPaise, strategy);
    },
    []
  );

  const markCalendarEventPaid = useCallback((eventId: string) => {
    loanRepo.markCalendarEventPaid(eventId);
  }, []);

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
    markCalendarEventPaid,
  };
}
