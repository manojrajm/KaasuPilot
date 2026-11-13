import {
  UserProfile,
  SecuritySettings,
  ExperienceSettings,
  ConnectedCard,
} from '@/domain/profile/types';
import { transactionRepo } from './transactionRepo';
import { loanRepo } from './loanRepo';

let profileStore: UserProfile = {
  name: 'Aravind',
  callSign: 'Cyber Pilot',
  tier: 'OBSIDIAN FOUNDER • LOCAL PILOT #001',
  monthlyIncomePaise: 6200000, // ₹ 62,000
  salaryDayOfMonth: 1,
  currencyFormat: 'inr_lakhs',
};

let securityStore: SecuritySettings = {
  biometricLockEnabled: true,
  autoLockDuration: 'immediate',
  privacyCurtainEnabled: true,
};

let experienceStore: ExperienceSettings = {
  hapticsEnabled: true,
  videoReactionsEnabled: true,
  threeVaultEnabled: true,
};

let cardsStore: ConnectedCard[] = [
  {
    id: 'card_hdfc_salary',
    bankName: 'HDFC BANK',
    cardTitle: 'Salary Titanium Debit',
    accountNumberMasked: '•••• •••• •••• 4821',
    cardHolder: 'ARAVIND',
    expiryStr: '09/29',
    cardType: 'visa',
    colorGradient: ['#041424', '#0A3156'],
    accentGlow: '#00F0FF',
    balancePaise: 6850000,
    isCredit: false,
  },
  {
    id: 'card_icici_savings',
    bankName: 'ICICI BANK',
    cardTitle: 'Coral Sapphire Savings',
    accountNumberMasked: '•••• •••• •••• 9012',
    cardHolder: 'ARAVIND',
    expiryStr: '11/28',
    cardType: 'mastercard',
    colorGradient: ['#280808', '#681515'],
    accentGlow: '#FF4D4D',
    balancePaise: 1350000,
    isCredit: false,
  },
  {
    id: 'card_regalia_gold',
    bankName: 'HDFC BANK',
    cardTitle: 'Regalia Gold 24K Metal',
    accountNumberMasked: '•••• •••• •••• 3341',
    cardHolder: 'ARAVIND',
    expiryStr: '04/30',
    cardType: 'visa',
    colorGradient: ['#1C1600', '#4A3B00'],
    accentGlow: '#FFD700',
    balancePaise: -420000,
    isCredit: true,
  },
];

type ProfileListener = () => void;
const listeners: Set<ProfileListener> = new Set();

function notify() {
  listeners.forEach((fn) => fn());
}

export const profileRepo = {
  subscribe(callback: ProfileListener) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  async getProfile(): Promise<UserProfile> {
    return { ...profileStore };
  },

  async updateProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
    profileStore = { ...profileStore, ...patch };
    notify();
    return { ...profileStore };
  },

  async getSecuritySettings(): Promise<SecuritySettings> {
    return { ...securityStore };
  },

  async updateSecuritySettings(
    patch: Partial<SecuritySettings>
  ): Promise<SecuritySettings> {
    securityStore = { ...securityStore, ...patch };
    notify();
    return { ...securityStore };
  },

  async getExperienceSettings(): Promise<ExperienceSettings> {
    return { ...experienceStore };
  },

  async updateExperienceSettings(
    patch: Partial<ExperienceSettings>
  ): Promise<ExperienceSettings> {
    experienceStore = { ...experienceStore, ...patch };
    notify();
    return { ...experienceStore };
  },

  async getCards(): Promise<ConnectedCard[]> {
    return [...cardsStore];
  },

  async exportEncryptedBackup(): Promise<string> {
    const txns = await transactionRepo.getAll();
    const loans = await loanRepo.getAll();

    const backupPayload = {
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      encryption: 'AES-256-GCM-SIMULATED',
      profile: profileStore,
      cards: cardsStore,
      transactionsCount: txns.length,
      loansCount: loans.length,
      transactions: txns,
      loans: loans,
    };

    return JSON.stringify(backupPayload, null, 2);
  },

  async exportCsv(): Promise<string> {
    const txns = await transactionRepo.getAll();
    let csv = 'ID,Date,Merchant,Direction,Amount_INR,Category,Source,Status\n';
    txns.forEach((t) => {
      const amountInr = (t.amountPaise / 100).toFixed(2);
      csv += `"${t.id}","${t.txnDate}","${t.merchant}","${t.direction}","${amountInr}","${t.categoryId}","${t.source}","${t.status}"\n`;
    });
    return csv;
  },

  async factoryResetVault(): Promise<boolean> {
    // Reset stores to fresh initial state
    profileStore.monthlyIncomePaise = 6200000;
    notify();
    return true;
  },
};
