import { Account } from '@/domain/types';
import {
  ExperienceSettings,
  SecuritySettings,
  UserProfile,
} from '@/domain/profile/types';
import { cardRepo } from './cardRepo';
import { categoryRepo } from './categoryRepo';
import { loanRepo } from './loanRepo';
import { salaryRepo } from './salaryRepo';
import { settingsRepo } from './settingsRepo';
import { transactionRepo } from './transactionRepo';

/** Profile, security and experience settings, persisted in the on-device database. */
export const profileRepo = {
  subscribe(callback: () => void) {
    const unsubscribeSettings = settingsRepo.subscribe(callback);
    const unsubscribeCards = cardRepo.subscribe(callback);
    return () => {
      unsubscribeSettings();
      unsubscribeCards();
    };
  },

  getProfile(): Promise<UserProfile> {
    return settingsRepo.get('profile');
  },

  /** Saves profile changes; salary changes also update the current cycle's salary entry. */
  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    const before = await settingsRepo.get('profile');
    const after = await settingsRepo.update('profile', patch);
    const salaryChanged =
      before.monthlyIncomePaise !== after.monthlyIncomePaise ||
      before.salaryDayOfMonth !== after.salaryDayOfMonth ||
      before.salaryAccountId !== after.salaryAccountId;
    if (salaryChanged) {
      await salaryRepo.onSalaryConfigChanged(before, after);
    }
    return after;
  },

  getSecuritySettings(): Promise<SecuritySettings> {
    return settingsRepo.get('security');
  },

  updateSecuritySettings(patch: Partial<SecuritySettings>): Promise<SecuritySettings> {
    return settingsRepo.update('security', patch);
  },

  getExperienceSettings(): Promise<ExperienceSettings> {
    return settingsRepo.get('experience');
  },

  updateExperienceSettings(patch: Partial<ExperienceSettings>): Promise<ExperienceSettings> {
    return settingsRepo.update('experience', patch);
  },

  /** The user's own cards (metadata only — numbers and CVVs stay in the keystore). */
  getCards(): Promise<Account[]> {
    return cardRepo.list();
  },

  /** Plain JSON export of the ledger. Card numbers and CVVs are deliberately excluded. */
  async exportEncryptedBackup(): Promise<string> {
    const [txns, loans, cards, profile, categories] = await Promise.all([
      transactionRepo.getAll(),
      loanRepo.getAll(),
      cardRepo.list(),
      settingsRepo.get('profile'),
      categoryRepo.getAll({ includeArchived: true }),
    ]);

    return JSON.stringify(
      {
        version: '3.0.0',
        exportedAt: new Date().toISOString(),
        profile: { ...profile, photoUri: null },
        cards: cards.map(({ id, name, bankCode, cardKind, network, lastFourDigits }) => ({
          id,
          name,
          bankCode,
          cardKind,
          network,
          lastFourDigits,
        })),
        categories,
        transactionsCount: txns.length,
        loansCount: loans.length,
        transactions: txns,
        loans,
      },
      null,
      2
    );
  },

  async exportCsv(): Promise<string> {
    const txns = await transactionRepo.getAll();
    let csv = 'ID,Date,Merchant,Direction,Amount_INR,Category,Source,Status\n';
    txns.forEach((t) => {
      const amountInr = (t.amountPaise / 100).toFixed(2);
      const merchant = t.merchant.replace(/"/g, '""');
      csv += `"${t.id}","${t.txnDate}","${merchant}","${t.direction}","${amountInr}","${t.categoryId}","${t.source}","${t.status}"\n`;
    });
    return csv;
  },

  /**
   * Restores security and experience settings to their defaults.
   * Profile, cards, loans and the ledger are kept.
   */
  async factoryResetVault(): Promise<boolean> {
    await settingsRepo.reset('security');
    await settingsRepo.reset('experience');
    return true;
  },
};
