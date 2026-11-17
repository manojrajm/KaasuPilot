/**
 * excelReportSheets.ts
 * Builds the worksheets (Summary dashboard, Daily Summary, Transactions) of the
 * KasuPilot monthly statistics workbook from already-filtered month transactions.
 */

import { Account, Transaction } from '@/domain/types';
import { XlsxCell, XlsxSheet } from './xlsxBuilder';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface ReportSheetsInput {
  year: number;
  month: number; // 1-12
  /** Non-ignored transactions of the month, sorted ascending by date. */
  txns: Transaction[];
  accountsMap: Map<string, Account>;
  categoryMap: Map<string, { name: string; emoji: string }>;
}

export interface ReportSheetsResult {
  sheets: XlsxSheet[];
  totalSpentPaise: number;
  totalIncomePaise: number;
  daysWithExpenses: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rupees = (paise: number) => Math.round(paise) / 100;
const blanks = (count: number, style: XlsxCell['style']): XlsxCell[] =>
  Array.from({ length: count }, () => ({ value: '', style }));
const fmtInr = (paise: number) =>
  '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Agg {
  paise: number;
  count: number;
}
const bump = (map: Map<string, Agg>, key: string, paise: number) => {
  const cur = map.get(key) || { paise: 0, count: 0 };
  map.set(key, { paise: cur.paise + paise, count: cur.count + 1 });
};

export function buildReportSheets(input: ReportSheetsInput): ReportSheetsResult {
  const { year, month, txns, accountsMap, categoryMap } = input;
  const monthName = MONTH_NAMES[month - 1];
  const monthLabel = `${monthName} ${year}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const generated = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  // ---- Aggregations -------------------------------------------------------
  let totalSpent = 0;
  let totalIncome = 0;
  let expenseCount = 0;
  let incomeCount = 0;
  let largest: Transaction | null = null;

  const byDay = new Map<string, { spent: number; income: number; count: number }>();
  const byCategory = new Map<string, Agg>();
  const byWeekday = new Map<string, Agg>();
  const byMerchant = new Map<string, Agg>();

  txns.forEach((tx) => {
    const d = new Date(tx.txnDate);
    const key = localDateKey(d);
    const day = byDay.get(key) || { spent: 0, income: 0, count: 0 };
    day.count += 1;
    if (tx.direction === 'debit') {
      totalSpent += tx.amountPaise;
      expenseCount += 1;
      day.spent += tx.amountPaise;
      bump(byCategory, tx.categoryId || 'cat_other', tx.amountPaise);
      bump(byWeekday, DAY_NAMES[d.getDay()], tx.amountPaise);
      bump(byMerchant, (tx.merchant || 'Unknown').trim() || 'Unknown', tx.amountPaise);
      if (!largest || tx.amountPaise > largest.amountPaise) largest = tx;
    } else {
      totalIncome += tx.amountPaise;
      incomeCount += 1;
      day.income += tx.amountPaise;
    }
    byDay.set(key, day);
  });

  const net = totalIncome - totalSpent;
  const savingsRate = totalIncome > 0 ? net / totalIncome : 0;
  const daysWithExpenses = Array.from(byDay.values()).filter((d) => d.spent > 0).length;
  const avgDaily = totalSpent / daysInMonth;
  const avgExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;
  const catName = (id: string) => categoryMap.get(id)?.name || 'Other';
  const pctOf = (paise: number) => (totalSpent > 0 ? paise / totalSpent : 0);

  const sortedCats = Array.from(byCategory.entries()).sort((a, b) => b[1].paise - a[1].paise);
  const sortedMerchants = Array.from(byMerchant.entries())
    .sort((a, b) => b[1].paise - a[1].paise)
    .slice(0, 10);
  const peakDay = Array.from(byDay.entries()).sort((a, b) => b[1].spent - a[1].spent)[0];
  const peakWeekday = Array.from(byWeekday.entries()).sort((a, b) => b[1].paise - a[1].paise)[0];

  // =========================================================================
  // Sheet 1: Summary
  // =========================================================================
  const S: XlsxCell[][] = [];
  const merges: string[] = [];
  const rowHeights: Record<number, number> = {};
  const bars: Array<{ range: string; color?: string }> = [];
  const NC = 6; // columns A..F
  const row = () => S.length + 1; // next 1-based row number

  merges.push('A1:F1', 'A2:F2');
  S.push([{ value: 'KASUPILOT  |  MONTHLY EXPENSE STATISTICS', style: 1 }, ...blanks(NC - 1, 1)]);
  rowHeights[1] = 36;
  S.push([
    { value: `${monthLabel}   •   Generated ${generated}   •   All amounts in INR`, style: 2 },
    ...blanks(NC - 1, 2),
  ]);
  rowHeights[2] = 20;
  S.push([]);

  const section = (title: string) => {
    merges.push(`A${row()}:F${row()}`);
    rowHeights[row()] = 22;
    S.push([{ value: title, style: 16 }, ...blanks(NC - 1, 16)]);
  };

  section('KEY METRICS');
  S.push(
    ['TOTAL INCOME', 'TOTAL SPENT', 'NET SAVINGS', 'SAVINGS RATE', 'AVG DAILY SPEND', 'TRANSACTIONS'].map(
      (v) => ({ value: v, style: 22 as const })
    )
  );
  rowHeights[row() - 1] = 22;
  S.push([
    { value: rupees(totalIncome), style: 12 },
    { value: rupees(totalSpent), style: 13 },
    { value: rupees(net), style: 14 },
    { value: savingsRate, style: 15 },
    { value: rupees(avgDaily), style: 14 },
    { value: txns.length, style: 23 },
  ]);
  rowHeights[row() - 1] = 34;
  S.push([]);

  section('INSIGHTS');
  const insight = (label: string, value: string) => {
    merges.push(`B${row()}:F${row()}`);
    S.push([{ value: label, style: 26 }, { value, style: 27 }, ...blanks(NC - 2, 27)]);
  };
  insight(
    'Highest spending day',
    peakDay && peakDay[1].spent > 0
      ? `${peakDay[0]} (${DAY_NAMES[new Date(peakDay[0] + 'T12:00:00').getDay()]})  —  ${fmtInr(peakDay[1].spent)}`
      : 'No expenses recorded'
  );
  insight(
    'Top spending category',
    sortedCats[0]
      ? `${catName(sortedCats[0][0])}  —  ${fmtInr(sortedCats[0][1].paise)}  (${(pctOf(sortedCats[0][1].paise) * 100).toFixed(1)}% of spend)`
      : 'No expenses recorded'
  );
  insight(
    'Largest single expense',
    largest
      ? `${(largest as Transaction).merchant || 'Unknown'}  —  ${fmtInr((largest as Transaction).amountPaise)}  on ${localDateKey(new Date((largest as Transaction).txnDate))}`
      : 'No expenses recorded'
  );
  insight('Average expense per transaction', expenseCount > 0 ? fmtInr(avgExpense) : '-');
  insight(
    'Busiest weekday (by spend)',
    peakWeekday ? `${peakWeekday[0]}  —  ${fmtInr(peakWeekday[1].paise)}` : '-'
  );
  insight(
    'Spending days',
    `${daysWithExpenses} of ${daysInMonth} days  (${daysInMonth - daysWithExpenses} no-spend days)`
  );
  insight('Transactions', `${expenseCount} expenses, ${incomeCount} income credits`);
  S.push([]);

  // Generic ranked table (A = label, B = spent, C = count, D = avg, E = share) with data bars.
  const rankedTable = (
    title: string,
    firstHeader: string,
    entries: Array<[string, Agg]>,
    totalLabel: string
  ) => {
    section(title);
    S.push(
      [firstHeader, 'Spent (₹)', 'Txns', 'Avg / Txn (₹)', '% of Spend', ''].map((v) => ({
        value: v,
        style: 3 as const,
      }))
    );
    rowHeights[row() - 1] = 22;
    if (entries.length === 0) {
      merges.push(`A${row()}:F${row()}`);
      S.push([{ value: 'No expenses recorded for this month', style: 28 }]);
      S.push([]);
      return;
    }
    const start = row();
    entries.forEach(([label, agg], i) => {
      const z = i % 2 === 1;
      S.push([
        { value: label, style: z ? 5 : 4 },
        { value: rupees(agg.paise), style: z ? 7 : 6 },
        { value: agg.count, style: z ? 21 : 20 },
        { value: rupees(agg.paise / Math.max(agg.count, 1)), style: z ? 7 : 6 },
        { value: pctOf(agg.paise), style: z ? 19 : 18 },
        { value: '', style: z ? 5 : 4 },
      ]);
    });
    const end = row() - 1;
    bars.push({ range: `E${start}:E${end}` });
    const sumPaise = entries.reduce((a, [, e]) => a + e.paise, 0);
    const sumCount = entries.reduce((a, [, e]) => a + e.count, 0);
    S.push([
      { value: totalLabel, style: 10 },
      { value: rupees(sumPaise), style: 11, formula: `SUM(B${start}:B${end})` },
      { value: sumCount, style: 25, formula: `SUM(C${start}:C${end})` },
      { value: rupees(sumPaise / Math.max(sumCount, 1)), style: 11, formula: `IFERROR(B${end + 1}/C${end + 1},0)` },
      { value: pctOf(sumPaise), style: 24, formula: `SUM(E${start}:E${end})` },
      { value: '', style: 10 },
    ]);
    S.push([]);
  };

  rankedTable(
    'SPENDING BY CATEGORY',
    'Category',
    sortedCats.map(([id, agg]) => [catName(id), agg] as [string, Agg]),
    'TOTAL'
  );

  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0].map((i) => DAY_NAMES[i]);
  rankedTable(
    'SPENDING BY WEEKDAY',
    'Weekday',
    weekdayOrder.map((d) => [d, byWeekday.get(d) || { paise: 0, count: 0 }] as [string, Agg]),
    'TOTAL'
  );

  rankedTable('TOP 10 MERCHANTS', 'Merchant', sortedMerchants, 'TOP 10 TOTAL');

  merges.push(`A${row()}:F${row()}`);
  S.push([
    { value: 'Percentages are shares of total expenses. Income credits are excluded from spend tables. Cancelled/ignored entries are omitted.', style: 28 },
  ]);

  const summarySheet: XlsxSheet = {
    name: 'Summary',
    columns: [{ width: 30 }, { width: 20 }, { width: 14 }, { width: 20 }, { width: 18 }, { width: 18 }],
    rows: S,
    merges,
    rowHeights,
    dataBars: bars,
    tabColor: 'FF0F172A',
    showGridLines: false,
  };

  // =========================================================================
  // Sheet 2: Daily Summary
  // =========================================================================
  const D: XlsxCell[][] = [];
  const dMerges = ['A1:H1', 'A2:H2'];
  D.push([{ value: `DAILY SUMMARY  |  ${monthLabel.toUpperCase()}`, style: 1 }, ...blanks(7, 1)]);
  D.push([
    { value: 'Every calendar day of the month with expenses, income, net flow and running total', style: 2 },
    ...blanks(7, 2),
  ]);
  D.push([]);
  D.push(
    ['Date', 'Weekday', 'Expenses (₹)', 'Income (₹)', 'Net (₹)', 'Txns', '% of Month Spend', 'Cumulative Spend (₹)'].map(
      (v) => ({ value: v, style: 3 as const })
    )
  );
  const dStart = 5;
  let cumulative = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${pad(month)}-${pad(day)}`;
    const agg = byDay.get(key) || { spent: 0, income: 0, count: 0 };
    cumulative += agg.spent;
    const z = day % 2 === 0;
    const r = dStart + day - 1;
    D.push([
      { value: key, style: z ? 32 : 17 },
      { value: DAY_NAMES[new Date(year, month - 1, day).getDay()], style: z ? 5 : 4 },
      { value: rupees(agg.spent), style: z ? 7 : 6 },
      { value: rupees(agg.income), style: z ? 7 : 6 },
      { value: rupees(agg.income - agg.spent), style: z ? 7 : 6, formula: `D${r}-C${r}` },
      { value: agg.count, style: z ? 21 : 20 },
      { value: pctOf(agg.spent), style: z ? 19 : 18, formula: `IFERROR(C${r}/C$${dStart + daysInMonth},0)` },
      { value: rupees(cumulative), style: z ? 7 : 6, formula: day === 1 ? `C${r}` : `H${r - 1}+C${r}` },
    ]);
  }
  const dEnd = dStart + daysInMonth - 1;
  D.push([
    { value: 'MONTH TOTAL', style: 10 },
    { value: '', style: 10 },
    { value: rupees(totalSpent), style: 11, formula: `SUM(C${dStart}:C${dEnd})` },
    { value: rupees(totalIncome), style: 11, formula: `SUM(D${dStart}:D${dEnd})` },
    { value: rupees(net), style: 11, formula: `D${dEnd + 1}-C${dEnd + 1}` },
    { value: txns.length, style: 25, formula: `SUM(F${dStart}:F${dEnd})` },
    { value: totalSpent > 0 ? 1 : 0, style: 24, formula: `SUM(G${dStart}:G${dEnd})` },
    { value: rupees(totalSpent), style: 11 },
  ]);

  const dailySheet: XlsxSheet = {
    name: 'Daily Summary',
    columns: [
      { width: 14 }, { width: 14 }, { width: 18 }, { width: 18 },
      { width: 18 }, { width: 8 }, { width: 18 }, { width: 22 },
    ],
    rows: D,
    merges: dMerges,
    rowHeights: { 1: 36, 2: 20, 4: 30 },
    freezeRows: 4,
    dataBars: [{ range: `G${dStart}:G${dEnd}`, color: 'FFF87171' }],
    tabColor: 'FF0369A1',
    showGridLines: false,
  };

  // =========================================================================
  // Sheet 3: Transactions
  // =========================================================================
  const T: XlsxCell[][] = [];
  T.push([{ value: `TRANSACTION LEDGER  |  ${monthLabel.toUpperCase()}`, style: 1 }, ...blanks(9, 1)]);
  T.push([
    { value: `${txns.length} transactions in chronological order  •  use the filter arrows to slice by category, type or account`, style: 2 },
    ...blanks(9, 2),
  ]);
  T.push([]);
  T.push(
    ['Date', 'Weekday', 'Time', 'Type', 'Category', 'Merchant / Description', 'Account', 'Source', 'Notes / Tags', 'Amount (₹)'].map(
      (v) => ({ value: v, style: 3 as const })
    )
  );
  const tStart = 5;
  txns.forEach((tx, i) => {
    const d = new Date(tx.txnDate);
    const z = i % 2 === 1;
    const isDebit = tx.direction === 'debit';
    const acc = accountsMap.get(tx.accountId);
    const accLabel = acc ? `${acc.name}${acc.lastFourDigits ? ` (..${acc.lastFourDigits})` : ''}` : 'Default';
    T.push([
      { value: localDateKey(d), style: z ? 32 : 17 },
      { value: DAY_NAMES[d.getDay()], style: z ? 5 : 4 },
      { value: `${pad(d.getHours())}:${pad(d.getMinutes())}`, style: z ? 32 : 17 },
      { value: isDebit ? 'Expense' : 'Income', style: z ? 32 : 17 },
      { value: catName(tx.categoryId), style: z ? 5 : 4 },
      { value: tx.merchant || (isDebit ? 'General Expense' : 'Credit'), style: z ? 5 : 4 },
      { value: accLabel, style: z ? 5 : 4 },
      { value: String(tx.source || '').toUpperCase(), style: z ? 32 : 17 },
      { value: [tx.note, tx.taxTag].filter(Boolean).join(' • ') || '-', style: z ? 5 : 4 },
      { value: rupees(tx.amountPaise), style: isDebit ? (z ? 7 : 6) : 31 },
    ]);
  });
  const tEnd = Math.max(tStart + txns.length - 1, tStart);
  T.push([]);
  if (txns.length > 0) {
    const tr = T.length + 1;
    T.push([
      { value: 'TOTAL EXPENSES', style: 10 }, ...blanks(8, 10),
      { value: rupees(totalSpent), style: 11, formula: `SUMIF(D${tStart}:D${tEnd},"Expense",J${tStart}:J${tEnd})` },
    ]);
    T.push([
      { value: 'TOTAL INCOME', style: 10 }, ...blanks(8, 10),
      { value: rupees(totalIncome), style: 11, formula: `SUMIF(D${tStart}:D${tEnd},"Income",J${tStart}:J${tEnd})` },
    ]);
    T.push([
      { value: 'NET', style: 10 }, ...blanks(8, 10),
      { value: rupees(net), style: 11, formula: `J${tr + 1}-J${tr}` },
    ]);
  }

  const ledgerSheet: XlsxSheet = {
    name: 'Transactions',
    columns: [
      { width: 13 }, { width: 13 }, { width: 8 }, { width: 11 }, { width: 22 },
      { width: 34 }, { width: 24 }, { width: 10 }, { width: 28 }, { width: 18 },
    ],
    rows: T,
    merges: ['A1:J1', 'A2:J2'],
    rowHeights: { 1: 36, 2: 20, 4: 30 },
    freezeRows: 4,
    autoFilter: txns.length > 0 ? `A4:J${tEnd}` : undefined,
    tabColor: 'FF15803D',
    showGridLines: false,
  };

  return {
    sheets: [summarySheet, dailySheet, ledgerSheet],
    totalSpentPaise: totalSpent,
    totalIncomePaise: totalIncome,
    daysWithExpenses,
  };
}
