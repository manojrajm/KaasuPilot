import { useCallback, useEffect, useState } from 'react';
import {
  AnnualTrajectoryResult,
  MonthlyDailyTrajectoryResult,
  trajectoryRepo,
} from '@/data/repositories/trajectoryRepo';
import { transactionRepo } from '@/data/repositories/transactionRepo';

export type TrajectoryGranularity = 'annual' | 'monthly_daily';
export type TrajectoryMode = 'unified' | 'spread' | 'cumulative';
export type TrajectoryLineKey = 'inflow' | 'outflow' | 'cumulative' | null;

export function useAnnualTrajectory(initialYear?: number, initialMonth?: number) {
  const currentYear = initialYear ?? new Date().getFullYear();
  const currentMonth = initialMonth ?? new Date().getMonth() + 1; // 1-12

  const [granularity, setGranularity] = useState<TrajectoryGranularity>('annual');
  const [year, setYear] = useState<number>(currentYear);
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<number>(currentMonth);
  const [timeframe, setTimeframe] = useState<'CY' | 'FY'>('CY');
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [activeMode, setActiveMode] = useState<TrajectoryMode>('unified');
  const [isolatedLine, setIsolatedLine] = useState<TrajectoryLineKey>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);

  const [annualData, setAnnualData] = useState<AnnualTrajectoryResult | null>(null);
  const [dailyData, setDailyData] = useState<MonthlyDailyTrajectoryResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const reload = useCallback(() => {
    Promise.all([
      trajectoryRepo.getAnnualTrajectory(year, timeframe),
      trajectoryRepo.getMonthlyDailyTrajectory(year, selectedMonthNumber),
      trajectoryRepo.getAvailableYears(),
    ])
      .then(([trajectory, daily, yrs]) => {
        setAnnualData(trajectory);
        setDailyData(daily);
        setAvailableYears(yrs);
        setLoading(false);
      })
      .catch((e) => {
        console.warn('[useAnnualTrajectory] Load error:', e);
        setLoading(false);
      });
  }, [year, timeframe, selectedMonthNumber]);

  useEffect(() => {
    let active = true;
    const loadData = () => {
      Promise.all([
        trajectoryRepo.getAnnualTrajectory(year, timeframe),
        trajectoryRepo.getMonthlyDailyTrajectory(year, selectedMonthNumber),
        trajectoryRepo.getAvailableYears(),
      ])
        .then(([trajectory, daily, yrs]) => {
          if (!active) return;
          setAnnualData(trajectory);
          setDailyData(daily);
          setAvailableYears(yrs);
          setLoading(false);
        })
        .catch((e) => {
          console.warn('[useAnnualTrajectory] Load error:', e);
          if (active) setLoading(false);
        });
    };

    loadData();
    const unsub = transactionRepo.subscribe(() => {
      if (active) loadData();
    });
    return () => {
      active = false;
      unsub();
    };
  }, [year, timeframe, selectedMonthNumber]);

  const toggleLineIsolation = useCallback((key: 'inflow' | 'outflow' | 'cumulative') => {
    setIsolatedLine((prev) => (prev === key ? null : key));
  }, []);

  const goToPrevMonth = useCallback(() => {
    setSelectedMonthNumber((prev) => {
      if (prev === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonthNumber((prev) => {
      if (prev === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const drillDownToMonth = useCallback((monthNum: number) => {
    setSelectedMonthNumber(monthNum);
    setGranularity('monthly_daily');
  }, []);

  const backToAnnual = useCallback(() => {
    setGranularity('annual');
  }, []);

  return {
    granularity,
    setGranularity,
    year,
    setYear,
    selectedMonthNumber,
    setSelectedMonthNumber,
    goToPrevMonth,
    goToNextMonth,
    drillDownToMonth,
    backToAnnual,
    timeframe,
    setTimeframe,
    availableYears,
    activeMode,
    setActiveMode,
    isolatedLine,
    toggleLineIsolation,
    selectedMonthIndex,
    setSelectedMonthIndex,
    data: annualData,
    annualData,
    dailyData,
    loading,
    refresh: reload,
  };
}
