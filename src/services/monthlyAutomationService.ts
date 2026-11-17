/**
 * monthlyAutomationService.ts
 * Checks monthly cycle rollover and automatically generates the audit-grade Excel/CSV
 * monthly expenditure report for the completed month.
 *
 * NOTE: Per user policy, automated background backups are disabled; backup is available
 * strictly on-demand via the instant backup button. Monthly reports are generated automatically.
 */

import { settingsRepo } from '@/data/repositories/settingsRepo';
import { excelReportService, MonthlyReportMetadata } from './excelReportService';
import { notificationService } from './notificationService';

export const monthlyAutomationService = {
  /**
   * Checks whether the previous month's report has already been generated.
   * If not, automatically compiles and saves the monthly Excel/CSV report and notifies the user.
   */
  async checkAndGenerateMonthlyReport(): Promise<MonthlyReportMetadata | null> {
    try {
      const now = new Date();
      // We look at the previous completed month (e.g. on Nov 1st, we generate Oct report)
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const targetYear = prevDate.getFullYear();
      const targetMonth = prevDate.getMonth() + 1; // 1-12
      const targetMonthKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

      const monthlyReport = await settingsRepo.get('monthlyReport');
      if (monthlyReport && monthlyReport.lastAutoReportMonth === targetMonthKey) {
        // Already generated for this month
        return null;
      }

      // Generate the report
      const meta = await excelReportService.exportMonthlyReport(targetYear, targetMonth);

      // Only notify if there were actual transactions
      if (meta.transactionsCount > 0) {
        await notificationService.sendReportReadyAlert(
          meta.monthLabel,
          meta.totalSpentPaise,
          meta.fileUri || undefined
        );
      }

      // Record that we have generated it
      await settingsRepo.set('monthlyReport', {
        lastAutoReportMonth: targetMonthKey,
      });

      return meta;
    } catch (err) {
      console.warn('[MonthlyAutomationService] Failed to generate auto monthly report:', err);
      return null;
    }
  },
};
