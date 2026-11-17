/**
 * excelReportService.ts
 * Generates audit-grade, professional executive Excel (.xlsx) workbooks and CSV reports
 * for KasuPilot with multi-tab structure:
 *  - Sheet 1: 📊 Executive Dashboard (KPI Stat Cards, Category Breakdown, Daily Trends)
 *  - Sheet 2: 📑 Detailed Ledger (Chronological transactions with everyday subtotals & grand totals)
 *
 * Fully compliant with ECMA-376 / ISO/IEC 29500 OpenXML standard. Opens natively in
 * Microsoft Excel, Google Sheets, and Apple Numbers with zero formatting warnings.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { settingsRepo } from '@/data/repositories/settingsRepo';
import { accountRepo } from '@/data/repositories/accountRepo';
import { transactionRepo } from '@/data/repositories/transactionRepo';
import { DEFAULT_CATEGORIES } from '@/data/seed/defaultCategories';
import { formatPaise } from '@/domain/money/format';
import { Account, Transaction } from '@/domain/types';
import { bytesToBase64, generateXlsxBinary } from './xlsxBuilder';
import { buildReportSheets } from './excelReportSheets';

export interface MonthlyReportMetadata {
  year: number;
  month: number; // 1-12
  monthLabel: string;
  totalSpentPaise: number;
  totalIncomePaise: number;
  netSavingsPaise: number;
  transactionsCount: number;
  daysWithExpensesCount: number;
  fileUri: string | null;
  filename: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Escapes a field for CSV according to RFC 4180 */
function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function paiseToRupees(paise: number): string {
  return (paise / 100).toFixed(2);
}

/** A reporting window; `end` is exclusive. Defaults to the calendar month. */
export interface ReportPeriod {
  start: Date;
  end: Date;
  label: string;
  /** Used in the file name, e.g. "October_2026" or "2026-10-05_to_2026-11-04". */
  fileKey: string;
}

export function periodForMonth(year: number, month: number): ReportPeriod {
  const name = MONTH_NAMES[month - 1];
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
    label: `${name} ${year}`,
    fileKey: `${name}_${year}`,
  };
}

export const excelReportService = {
  /**
   * Builds the complete, high-fidelity OpenXML (.xlsx) multi-sheet workbook binary.
   */
  async buildMonthlyXlsxBytes(year: number, month: number, period?: ReportPeriod): Promise<{
    xlsxBytes: Uint8Array;
    base64: string;
    meta: MonthlyReportMetadata;
  }> {
    const [allTxns, allAccounts] = await Promise.all([
      transactionRepo.getAll(),
      accountRepo.getAll(),
    ]);

    const accountsMap = new Map<string, Account>();
    allAccounts.forEach((acc) => accountsMap.set(acc.id, acc));

    const categoryMap = new Map<string, { name: string; emoji: string }>();
    DEFAULT_CATEGORIES.forEach((cat) =>
      categoryMap.set(cat.id, { name: cat.name, emoji: cat.emoji })
    );

    const range = period ?? periodForMonth(year, month);
    const monthTxns = allTxns.filter((tx) => {
      if (tx.status === 'ignored') return false;
      const t = new Date(tx.txnDate).getTime();
      return t >= range.start.getTime() && t < range.end.getTime();
    });
    monthTxns.sort((a, b) => new Date(a.txnDate).getTime() - new Date(b.txnDate).getTime());

    const monthLabel = range.label;
    const filename = `KasuPilot_Expenses_${range.fileKey}.xlsx`;

    const report = buildReportSheets({
      start: range.start,
      end: range.end,
      label: range.label,
      txns: monthTxns,
      accountsMap,
      categoryMap,
    });
    const xlsxBytes = generateXlsxBinary(report.sheets);
    const base64 = bytesToBase64(xlsxBytes);

    const meta: MonthlyReportMetadata = {
      year,
      month,
      monthLabel,
      totalSpentPaise: report.totalSpentPaise,
      totalIncomePaise: report.totalIncomePaise,
      netSavingsPaise: report.totalIncomePaise - report.totalSpentPaise,
      transactionsCount: monthTxns.length,
      daysWithExpensesCount: report.daysWithExpenses,
      fileUri: null,
      filename,
    };

    return { xlsxBytes, base64, meta };
  },

  /**
   * Generates a companion CSV spreadsheet string for a specific year and month.
   */
  async buildMonthlyCsvString(year: number, month: number): Promise<{
    csvContent: string;
    meta: MonthlyReportMetadata;
  }> {
    const [allTxns, allAccounts] = await Promise.all([
      transactionRepo.getAll(),
      accountRepo.getAll(),
    ]);

    const accountsMap = new Map<string, Account>();
    allAccounts.forEach((acc) => accountsMap.set(acc.id, acc));

    const categoryMap = new Map<string, { name: string; emoji: string }>();
    DEFAULT_CATEGORIES.forEach((cat) =>
      categoryMap.set(cat.id, { name: cat.name, emoji: cat.emoji })
    );

    const monthTxns = allTxns.filter((tx) => {
      if (tx.status === 'ignored') return false;
      const d = new Date(tx.txnDate);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    monthTxns.sort((a, b) => new Date(a.txnDate).getTime() - new Date(b.txnDate).getTime());

    let totalSpentPaise = 0;
    let totalIncomePaise = 0;

    monthTxns.forEach((tx) => {
      if (tx.direction === 'debit') {
        totalSpentPaise += tx.amountPaise;
      } else {
        totalIncomePaise += tx.amountPaise;
      }
    });

    const netSavingsPaise = totalIncomePaise - totalSpentPaise;
    const monthName = MONTH_NAMES[month - 1];
    const monthLabel = `${monthName} ${year}`;
    const filename = `KasuPilot_Expenses_${monthName}_${year}.csv`;

    const dailyExpensesMap = new Map<string, Transaction[]>();
    const dailySubtotalsPaiseMap = new Map<string, number>();

    monthTxns.forEach((tx) => {
      if (tx.direction !== 'debit') return;
      const dateKey = tx.txnDate.slice(0, 10);
      if (!dailyExpensesMap.has(dateKey)) {
        dailyExpensesMap.set(dateKey, []);
        dailySubtotalsPaiseMap.set(dateKey, 0);
      }
      dailyExpensesMap.get(dateKey)!.push(tx);
      dailySubtotalsPaiseMap.set(
        dateKey,
        (dailySubtotalsPaiseMap.get(dateKey) || 0) + tx.amountPaise
      );
    });

    const lines: string[] = [];
    lines.push('\uFEFF"KASUPILOT FINANCIAL COCKPIT — MONTHLY EXPENDITURE AUDIT REPORT"');
    lines.push(`"Report Period:","01 ${monthName} ${year} to End of Month"`);
    lines.push(`"Generated On:","${new Date().toLocaleString('en-IN')}"`);
    lines.push(`"Currency:","INR (₹)"`);
    lines.push(`"Total Inflow / Salary:","${formatPaise(totalIncomePaise)}"`);
    lines.push(`"Total Outflow / Spent:","${formatPaise(totalSpentPaise)}"`);
    lines.push(
      `"Net Savings for Month:","${formatPaise(netSavingsPaise)} (${
        totalIncomePaise > 0
          ? ((netSavingsPaise / totalIncomePaise) * 100).toFixed(1) + '%'
          : '0.0%'
      })"`
    );
    lines.push(`"Total Transactions:","${monthTxns.length}"`);
    lines.push('""');

    lines.push(
      [
        escapeCsv('Date'),
        escapeCsv('Day'),
        escapeCsv('Time'),
        escapeCsv('Category'),
        escapeCsv('Merchant / Description'),
        escapeCsv('Account / Card'),
        escapeCsv('Payment Mode'),
        escapeCsv('Notes / Tags'),
        escapeCsv('Amount (₹)'),
        escapeCsv('Everyday Subtotal (₹)'),
      ].join(',')
    );

    const sortedDates = Array.from(dailyExpensesMap.keys()).sort();

    sortedDates.forEach((dateKey) => {
      const txnsForDay = dailyExpensesMap.get(dateKey)!;
      const dayDate = new Date(dateKey + 'T12:00:00Z');
      const dayName = DAY_NAMES[dayDate.getUTCDay()];
      const subtotalPaise = dailySubtotalsPaiseMap.get(dateKey) || 0;

      txnsForDay.forEach((tx) => {
        const txDate = new Date(tx.txnDate);
        const timeStr = txDate.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const cat = categoryMap.get(tx.categoryId) || { name: 'Other', emoji: '📦' };
        const acc = accountsMap.get(tx.accountId);
        const accLabel = acc
          ? `${acc.name}${acc.lastFourDigits ? ` (..${acc.lastFourDigits})` : ''}`
          : 'Default Vault';
        const mode = tx.source.toUpperCase();
        const notes = [tx.note, tx.taxTag].filter(Boolean).join(' • ');

        lines.push(
          [
            escapeCsv(dateKey),
            escapeCsv(dayName),
            escapeCsv(timeStr),
            escapeCsv(`${cat.name} ${cat.emoji}`),
            escapeCsv(tx.merchant || 'General Expense'),
            escapeCsv(accLabel),
            escapeCsv(mode),
            escapeCsv(notes),
            paiseToRupees(tx.amountPaise),
            '""',
          ].join(',')
        );
      });

      lines.push(
        [
          escapeCsv(`★★★ ${dateKey} (${dayName.toUpperCase()}) TOTAL EXPENSES [${txnsForDay.length} Txns]`),
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          paiseToRupees(subtotalPaise),
          escapeCsv(formatPaise(subtotalPaise)),
        ].join(',')
      );
      lines.push('""');
    });

    lines.push(
      [
        escapeCsv(`🏆 GRAND TOTAL MONTHLY EXPENDITURE (${monthName.toUpperCase()} ${year})`),
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        paiseToRupees(totalSpentPaise),
        escapeCsv(formatPaise(totalSpentPaise)),
      ].join(',')
    );

    const csvContent = lines.join('\r\n');

    const meta: MonthlyReportMetadata = {
      year,
      month,
      monthLabel,
      totalSpentPaise,
      totalIncomePaise,
      netSavingsPaise,
      transactionsCount: monthTxns.length,
      daysWithExpensesCount: sortedDates.length,
      fileUri: null,
      filename,
    };

    return { csvContent, meta };
  },

  /**
   * Saves the generated .xlsx workbook to the device internal storage under reports/ directory.
   */
  async exportMonthlyReport(
    year: number,
    month: number,
    period?: ReportPeriod
  ): Promise<MonthlyReportMetadata> {
    const { base64, meta } = await this.buildMonthlyXlsxBytes(year, month, period);
    const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
    if (!baseDir) {
      throw new Error('Device filesystem storage is unavailable.');
    }

    const reportsDir = `${baseDir}reports/`;
    try {
      const dirInfo = await FileSystem.getInfoAsync(reportsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(reportsDir, { intermediates: true });
      }
    } catch {
      // ignore
    }

    const fileUri = `${reportsDir}${meta.filename}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    meta.fileUri = fileUri;
    return meta;
  },

  async readFileBase64(fileUri: string): Promise<string> {
    return FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  },

  /**
   * Writes the report into the folder the user chose earlier (Android), with no prompt.
   * Returns the saved file URI, or null when no folder is remembered or access was revoked.
   */
  async saveToRememberedFolder(base64: string, filename: string): Promise<string | null> {
    if (Platform.OS !== 'android') return null;
    try {
      const { downloadDirUri } = await settingsRepo.get('monthlyReport');
      if (!downloadDirUri) return null;
      const uri = await FileSystem.StorageAccessFramework.createFileAsync(
        downloadDirUri,
        filename.replace(/\.xlsx$/i, ''),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      return uri;
    } catch (err) {
      console.warn('[Report] Remembered folder is no longer writable:', err);
      await settingsRepo.update('monthlyReport', { downloadDirUri: null });
      return null;
    }
  },

  /**
   * Downloads the high-fidelity .xlsx report directly into the user's public Downloads directory
   * using Android Storage Access Framework (SAF) or native Share sheet.
   */
  async downloadReportToUserStorage(
    year: number,
    month: number
  ): Promise<{
    success: boolean;
    folderName: string;
    filename: string;
    isPublicDownloads: boolean;
    fileUri: string | null;
  }> {
    // 1. Ensure internal .xlsx copy is compiled and written
    const { base64, meta } = await this.buildMonthlyXlsxBytes(year, month);
    const internalMeta = await this.exportMonthlyReport(year, month);

    // 2. On Android, use StorageAccessFramework to save directly into Downloads folder
    if (Platform.OS === 'android') {
      try {
        let initialUri: string | undefined;
        try {
          initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
        } catch {
          // ignore
        }

        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
          initialUri
        );

        if (permissions.granted && permissions.directoryUri) {
          await settingsRepo.update('monthlyReport', { downloadDirUri: permissions.directoryUri });
          const baseName = meta.filename.replace(/\.xlsx$/i, '');
          const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            baseName,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );

          await FileSystem.writeAsStringAsync(targetUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          return {
            success: true,
            folderName: 'Downloads',
            filename: meta.filename,
            isPublicDownloads: true,
            fileUri: targetUri,
          };
        }
      } catch (safErr) {
        console.warn('StorageAccessFramework error, falling back to Share sheet:', safErr);
      }
    }

    // 3. Fallback: Share sheet allows the user to tap "Save to Files" or "Save to Downloads"
    if (internalMeta.fileUri) {
      await Sharing.shareAsync(internalMeta.fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Save ${meta.filename}`,
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      });
      return {
        success: true,
        folderName: 'Files / Downloads',
        filename: meta.filename,
        isPublicDownloads: false,
        fileUri: internalMeta.fileUri,
      };
    }

    return {
      success: false,
      folderName: 'Internal Storage',
      filename: meta.filename,
      isPublicDownloads: false,
      fileUri: internalMeta.fileUri,
    };
  },

  /**
   * Generates and immediately shares the .xlsx report via OS native share sheet (WhatsApp, Email, Drive).
   */
  async shareMonthlyReport(
    year: number,
    month: number
  ): Promise<{ success: boolean; meta: MonthlyReportMetadata }> {
    const meta = await this.exportMonthlyReport(year, month);
    if (!meta.fileUri) {
      throw new Error('Could not generate report file for sharing.');
    }

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(meta.fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `KasuPilot Report - ${meta.monthLabel}`,
          UTI: 'org.openxmlformats.spreadsheetml.sheet',
        });
      } else {
        throw new Error('Sharing is not available on this device.');
      }
      return { success: true, meta };
    } catch (err) {
      console.warn('Share canceled or failed', err);
      return { success: false, meta };
    }
  },

  /**
   * Discovers distinct months present in the ledger so the user can pick any month to export.
   */
  async getAvailableReportMonths(): Promise<Array<{ year: number; month: number; label: string }>> {
    const txns = await transactionRepo.getAll();
    const monthsSet = new Set<string>();

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    monthsSet.add(`${curYear}-${String(curMonth).padStart(2, '0')}`);

    const prevDate = new Date(curYear, now.getMonth() - 1, 1);
    monthsSet.add(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);

    txns.forEach((tx) => {
      if (tx.txnDate) {
        const d = new Date(tx.txnDate);
        if (!isNaN(d.getTime())) {
          monthsSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });

    const result = Array.from(monthsSet)
      .sort()
      .reverse()
      .map((key) => {
        const [yStr, mStr] = key.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        return {
          year: y,
          month: m,
          label: `${MONTH_NAMES[m - 1]} ${y}`,
        };
      });

    return result;
  },
};
