/**
 * monthlyAutomationService.ts
 * When a salary cycle has finished (the next salary date has arrived), automatically builds the
 * Excel statistics report for that cycle, saves it, and notifies the user.
 *
 * The salary day comes from the profile; a salary day of 1 gives plain calendar months.
 * It runs whenever the app is opened, so a cycle that ended while the app was closed is
 * reported the next time it is launched.
 */

import { settingsRepo } from '@/data/repositories/settingsRepo';
import { cycleContaining } from '@/domain/budget/salaryCycle';
import { excelReportService, MonthlyReportMetadata, ReportPeriod } from './excelReportService';
import { notificationService } from './notificationService';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function periodLabel(start: Date, lastDay: Date): string {
  const s = `${start.getDate()} ${MONTH_SHORT[start.getMonth()]}`;
  const e = `${lastDay.getDate()} ${MONTH_SHORT[lastDay.getMonth()]} ${lastDay.getFullYear()}`;
  return `${s} - ${e}`;
}

export const monthlyAutomationService = {
  /** The salary cycle that most recently finished, as a report period. */
  async getLastCompletedPeriod(now: Date = new Date()): Promise<ReportPeriod & { cycleKey: string }> {
    const profile = await settingsRepo.get('profile');
    const current = cycleContaining(profile.salaryDayOfMonth, now);
    const dayBefore = new Date(current.start.getTime() - 24 * 60 * 60 * 1000);
    const previous = cycleContaining(profile.salaryDayOfMonth, dayBefore);
    const lastDay = new Date(previous.end.getTime() - 24 * 60 * 60 * 1000);
    return {
      start: previous.start,
      end: previous.end,
      label: periodLabel(previous.start, lastDay),
      fileKey: `${ymd(previous.start)}_to_${ymd(lastDay)}`,
      cycleKey: previous.key,
    };
  },

  /**
   * Generates the report for the last finished salary cycle if it has not been generated yet.
   * Returns null when there is nothing to do (already generated, or no data).
   */
  async checkAndGenerateMonthlyReport(): Promise<MonthlyReportMetadata | null> {
    try {
      const period = await this.getLastCompletedPeriod();

      const state = await settingsRepo.get('monthlyReport');
      if (state.lastAutoReportMonth === period.cycleKey) return null;

      const meta = await excelReportService.exportMonthlyReport(
        period.start.getFullYear(),
        period.start.getMonth() + 1,
        period
      );

      // Copy into the user's chosen Downloads folder when they have set one up.
      if (meta.transactionsCount > 0 && meta.fileUri) {
        const base64 = await excelReportService.readFileBase64(meta.fileUri);
        await excelReportService.saveToRememberedFolder(base64, meta.filename);
      }

      if (meta.transactionsCount > 0) {
        await notificationService.sendReportReadyAlert(
          meta.monthLabel,
          meta.totalSpentPaise,
          meta.fileUri || undefined
        );
      }

      await settingsRepo.update('monthlyReport', { lastAutoReportMonth: period.cycleKey });
      return meta;
    } catch (err) {
      console.warn('[MonthlyAutomationService] Failed to generate auto report:', err);
      return null;
    }
  },
};
