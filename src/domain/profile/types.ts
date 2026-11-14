import { Paise } from '@/domain/money/paise';

export interface UserProfile {
  name: string;
  callSign: string;
  tier: string;
  /** Monthly salary credited automatically at the start of every salary cycle. */
  monthlyIncomePaise: Paise;
  salaryDayOfMonth: number;
  /** Card / account the salary is credited to. */
  salaryAccountId: string | null;
  /** file:// URI of the profile photo copied into the app's private storage. */
  photoUri: string | null;
  currencyFormat: 'inr_lakhs' | 'standard';
}

export interface SecuritySettings {
  /** App lock with biometrics, falling back to the PIN. */
  biometricLockEnabled: boolean;
  autoLockDuration: 'immediate' | '1m' | '5m';
  /** Blocks screenshots and hides the app in the recent-apps switcher. */
  privacyCurtainEnabled: boolean;
}

export interface ExperienceSettings {
  hapticsEnabled: boolean;
  videoReactionsEnabled: boolean;
  threeVaultEnabled: boolean;
}

/** Salary-cycle bookkeeping kept between app launches. */
export interface SalaryState {
  /** Key ("YYYY-MM-DD") of the latest cycle whose salary has been credited. */
  lastCycleKey: string | null;
  /** Balance carried into the current cycle from the previous one. */
  carriedInPaise: Paise;
  /** Total moved to savings at past cycle rollovers. */
  savingsPaise: Paise;
  /** A finished cycle with money left, waiting for the user to choose carry or savings. */
  pendingRollover: { cycleKey: string; previousBalancePaise: Paise } | null;
}

export const DEFAULT_PROFILE: UserProfile = {
  name: '',
  callSign: 'Pilot',
  tier: 'LOCAL VAULT • PERSONAL',
  monthlyIncomePaise: 0,
  salaryDayOfMonth: 1,
  salaryAccountId: null,
  photoUri: null,
  currencyFormat: 'inr_lakhs',
};

export const DEFAULT_SECURITY: SecuritySettings = {
  biometricLockEnabled: true,
  autoLockDuration: '1m',
  privacyCurtainEnabled: true,
};

export const DEFAULT_EXPERIENCE: ExperienceSettings = {
  hapticsEnabled: true,
  videoReactionsEnabled: true,
  threeVaultEnabled: true,
};

export const DEFAULT_SALARY_STATE: SalaryState = {
  lastCycleKey: null,
  carriedInPaise: 0,
  savingsPaise: 0,
  pendingRollover: null,
};
