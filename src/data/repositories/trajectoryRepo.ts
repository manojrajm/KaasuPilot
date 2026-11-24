import { getDb } from '@/data/db/client';

export interface AnnualTrajectoryMonth {
  index: number;
  monthName: string;
  fullLabel: string;
  year: number;
  monthNumber: number; // 1-12
  inflowPaise: number;
  outflowPaise: number;
  netSavingsPaise: number;
  cumulativeSavingsPaise: number;
  savingsRatePercent: number;
  transactionCount: number;
}

export interface DailyTrajectoryPoint {
  dayNumber: number; // 1-31
  dateIso: string; // YYYY-MM-DD
  dayOfWeek: string; // 'Mon', 'Tue', etc.
  fullLabel: string; // '18 Nov 2026'
  inflowPaise: number;
  outflowPaise: number;
  netSavingsPaise: number;
  cumulativeSavingsPaise: number;
  transactionCount: number;
  topMerchant?: string;
}

export interface MonthlyDailyTrajectoryResult {
  year: number;
  monthNumber: number; // 1-12
  monthLabel: string;
  totalDays: number;
  days: DailyTrajectoryPoint[];
  totals: {
    inflowPaise: number;
    outflowPaise: number;
    netSavingsPaise: number;
    cumulativeSavingsPaise: number;
    activeDaysCount: number;
    peakOutflowDay: number;
    peakOutflowPaise: number;
    peakInflowDay: number;
    peakInflowPaise: number;
  };
}

export interface AnnualTrajectoryResult {
  timeframe: 'CY' | 'FY';
  year: number;
  label: string;
  months: AnnualTrajectoryMonth[];
  totals: {
    inflowPaise: number;
    outflowPaise: number;
    netSavingsPaise: number;
    cumulativeSavingsPaise: number;
    savingsRatePercent: number;
    peakInflowMonth: string;
    peakOutflowMonth: string;
  };
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface AggregateRow {
  month_num: number;
  year_num: number;
  direction: 'debit' | 'credit';
  total_paise: number;
  tx_count: number;
}

export const trajectoryRepo = {
  async getAvailableYears(): Promise<number[]> {
    const db = await getDb();
    try {
      const rows = await db.getAllAsync<{ yr: number }>(`
        SELECT DISTINCT CAST(strftime('%Y', txn_date) AS INTEGER) AS yr
        FROM transactions
        WHERE status = 'confirmed' AND txn_date IS NOT NULL
        ORDER BY yr DESC
      `);
      if (rows && rows.length > 0) {
        return rows.map((r) => r.yr).filter((y) => !isNaN(y) && y > 2000);
      }
    } catch (e) {
      console.warn('[trajectoryRepo] getAvailableYears error:', e);
    }
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1];
  },

  async getAnnualTrajectory(
    year: number,
    timeframe: 'CY' | 'FY' = 'CY'
  ): Promise<AnnualTrajectoryResult> {
    const db = await getDb();

    // 1. Determine months sequence
    // Calendar Year (CY): Jan (1) to Dec (12) of specified year
    // Fiscal Year (FY): Apr (4) of year to Mar (3) of year + 1
    const monthConfigs: { year: number; monthNum: number; label: string; full: string }[] = [];

    if (timeframe === 'CY') {
      for (let m = 1; m <= 12; m++) {
        monthConfigs.push({
          year,
          monthNum: m,
          label: MONTH_NAMES[m - 1],
          full: `${FULL_MONTH_NAMES[m - 1]} ${year}`,
        });
      }
    } else {
      // Indian Financial Year: Apr-Dec of current year + Jan-Mar of next year
      for (let m = 4; m <= 12; m++) {
        monthConfigs.push({
          year,
          monthNum: m,
          label: MONTH_NAMES[m - 1],
          full: `${FULL_MONTH_NAMES[m - 1]} ${year}`,
        });
      }
      for (let m = 1; m <= 3; m++) {
        monthConfigs.push({
          year: year + 1,
          monthNum: m,
          label: MONTH_NAMES[m - 1],
          full: `${FULL_MONTH_NAMES[m - 1]} ${year + 1}`,
        });
      }
    }

    // 2. Query aggregations from SQLite
    let rows: AggregateRow[] = [];
    try {
      const minDate = `${monthConfigs[0].year}-${String(monthConfigs[0].monthNum).padStart(2, '0')}-01`;
      const lastMonth = monthConfigs[11];
      const maxDate = `${lastMonth.year}-${String(lastMonth.monthNum).padStart(2, '0')}-31T23:59:59`;

      rows = await db.getAllAsync<AggregateRow>(
        `
        SELECT
          CAST(strftime('%m', txn_date) AS INTEGER) AS month_num,
          CAST(strftime('%Y', txn_date) AS INTEGER) AS year_num,
          direction,
          SUM(amount_paise) AS total_paise,
          COUNT(*) AS tx_count
        FROM transactions
        WHERE status = 'confirmed'
          AND txn_date >= ?
          AND txn_date <= ?
        GROUP BY year_num, month_num, direction
        `,
        minDate,
        maxDate
      );
    } catch (e) {
      console.warn('[trajectoryRepo] getAnnualTrajectory query error:', e);
    }

    // 3. Map into fast lookup table
    const aggregateMap = new Map<string, { inflow: number; outflow: number; count: number }>();
    for (const r of rows) {
      const key = `${r.year_num}_${r.month_num}`;
      const existing = aggregateMap.get(key) || { inflow: 0, outflow: 0, count: 0 };
      if (r.direction === 'credit') {
        existing.inflow += r.total_paise || 0;
      } else {
        existing.outflow += r.total_paise || 0;
      }
      existing.count += r.tx_count || 0;
      aggregateMap.set(key, existing);
    }

    // 4. Compute trajectory sequence with cumulative compounding
    let runningCumulative = 0;
    let totalInflow = 0;
    let totalOutflow = 0;
    let maxInflowMonth = monthConfigs[0].label;
    let maxInflowVal = -1;
    let maxOutflowMonth = monthConfigs[0].label;
    let maxOutflowVal = -1;

    const months: AnnualTrajectoryMonth[] = monthConfigs.map((cfg, idx) => {
      const key = `${cfg.year}_${cfg.monthNum}`;
      const data = aggregateMap.get(key) || { inflow: 0, outflow: 0, count: 0 };

      const netSavings = data.inflow - data.outflow;
      runningCumulative += netSavings;
      totalInflow += data.inflow;
      totalOutflow += data.outflow;

      if (data.inflow > maxInflowVal) {
        maxInflowVal = data.inflow;
        maxInflowMonth = cfg.label;
      }
      if (data.outflow > maxOutflowVal) {
        maxOutflowVal = data.outflow;
        maxOutflowMonth = cfg.label;
      }

      const savingsRate =
        data.inflow > 0 ? Math.round((netSavings / data.inflow) * 100) : 0;

      return {
        index: idx,
        monthName: cfg.label,
        fullLabel: cfg.full,
        year: cfg.year,
        monthNumber: cfg.monthNum,
        inflowPaise: data.inflow,
        outflowPaise: data.outflow,
        netSavingsPaise: netSavings,
        cumulativeSavingsPaise: runningCumulative,
        savingsRatePercent: savingsRate,
        transactionCount: data.count,
      };
    });

    const netSavings = totalInflow - totalOutflow;
    const overallSavingsRate =
      totalInflow > 0 ? Math.round((netSavings / totalInflow) * 100) : 0;

    const label =
      timeframe === 'CY'
        ? `CY ${year}`
        : `FY ${String(year).slice(-2)}-${String(year + 1).slice(-2)}`;

    return {
      timeframe,
      year,
      label,
      months,
      totals: {
        inflowPaise: totalInflow,
        outflowPaise: totalOutflow,
        netSavingsPaise: netSavings,
        cumulativeSavingsPaise: runningCumulative,
        savingsRatePercent: overallSavingsRate,
        peakInflowMonth: maxInflowMonth,
        peakOutflowMonth: maxOutflowMonth,
      },
    };
  },

  async getMonthlyDailyTrajectory(
    year: number,
    monthNumber: number // 1-12
  ): Promise<MonthlyDailyTrajectoryResult> {
    const db = await getDb();
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const monthStr = String(monthNumber).padStart(2, '0');
    const minDate = `${year}-${monthStr}-01`;
    const maxDate = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}T23:59:59`;

    interface DayAggregateRow {
      day_num: number;
      direction: 'debit' | 'credit';
      total_paise: number;
      tx_count: number;
    }

    interface TopMerchantRow {
      day_num: number;
      merchant: string;
      total_paise: number;
    }

    let rows: DayAggregateRow[] = [];
    let topMerchants: TopMerchantRow[] = [];

    try {
      rows = await db.getAllAsync<DayAggregateRow>(
        `
        SELECT
          CAST(strftime('%d', txn_date) AS INTEGER) AS day_num,
          direction,
          SUM(amount_paise) AS total_paise,
          COUNT(*) AS tx_count
        FROM transactions
        WHERE status = 'confirmed'
          AND txn_date >= ?
          AND txn_date <= ?
        GROUP BY day_num, direction
        `,
        minDate,
        maxDate
      );

      topMerchants = await db.getAllAsync<TopMerchantRow>(
        `
        SELECT
          CAST(strftime('%d', txn_date) AS INTEGER) AS day_num,
          merchant,
          SUM(amount_paise) AS total_paise
        FROM transactions
        WHERE status = 'confirmed'
          AND txn_date >= ?
          AND txn_date <= ?
        GROUP BY day_num, merchant
        ORDER BY total_paise DESC
        `,
        minDate,
        maxDate
      );
    } catch (e) {
      console.warn('[trajectoryRepo] getMonthlyDailyTrajectory query error:', e);
    }

    const dayMap = new Map<number, { inflow: number; outflow: number; count: number }>();
    for (const r of rows) {
      const existing = dayMap.get(r.day_num) || { inflow: 0, outflow: 0, count: 0 };
      if (r.direction === 'credit') {
        existing.inflow += r.total_paise || 0;
      } else {
        existing.outflow += r.total_paise || 0;
      }
      existing.count += r.tx_count || 0;
      dayMap.set(r.day_num, existing);
    }

    const topMerchantMap = new Map<number, string>();
    for (const tm of topMerchants) {
      if (!topMerchantMap.has(tm.day_num)) {
        topMerchantMap.set(tm.day_num, tm.merchant);
      }
    }

    const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthShort = MONTH_NAMES[monthNumber - 1];
    const monthFull = FULL_MONTH_NAMES[monthNumber - 1];

    let runningCumulative = 0;
    let totalInflow = 0;
    let totalOutflow = 0;
    let activeDaysCount = 0;
    let peakOutflowDay = 1;
    let peakOutflowPaise = 0;
    let peakInflowDay = 1;
    let peakInflowPaise = 0;

    const days: DailyTrajectoryPoint[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayData = dayMap.get(d) || { inflow: 0, outflow: 0, count: 0 };
      const dateObj = new Date(year, monthNumber - 1, d);
      const dayOfWeek = DAY_ABBR[dateObj.getDay()];
      const dateIso = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
      const fullLabel = `${d} ${monthShort} ${year}`;

      const netSavings = dayData.inflow - dayData.outflow;
      runningCumulative += netSavings;
      totalInflow += dayData.inflow;
      totalOutflow += dayData.outflow;

      if (dayData.count > 0) {
        activeDaysCount++;
      }

      if (dayData.outflow > peakOutflowPaise) {
        peakOutflowPaise = dayData.outflow;
        peakOutflowDay = d;
      }

      if (dayData.inflow > peakInflowPaise) {
        peakInflowPaise = dayData.inflow;
        peakInflowDay = d;
      }

      days.push({
        dayNumber: d,
        dateIso,
        dayOfWeek,
        fullLabel,
        inflowPaise: dayData.inflow,
        outflowPaise: dayData.outflow,
        netSavingsPaise: netSavings,
        cumulativeSavingsPaise: runningCumulative,
        transactionCount: dayData.count,
        topMerchant: topMerchantMap.get(d),
      });
    }

    return {
      year,
      monthNumber,
      monthLabel: `${monthFull} ${year}`,
      totalDays: daysInMonth,
      days,
      totals: {
        inflowPaise: totalInflow,
        outflowPaise: totalOutflow,
        netSavingsPaise: totalInflow - totalOutflow,
        cumulativeSavingsPaise: runningCumulative,
        activeDaysCount,
        peakOutflowDay,
        peakOutflowPaise,
        peakInflowDay,
        peakInflowPaise,
      },
    };
  },
};
