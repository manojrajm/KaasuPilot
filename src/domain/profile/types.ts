import { Paise } from '@/domain/money/paise';

export interface UserProfile {
  name: string;
  callSign: string;
  tier: string;
  monthlyIncomePaise: Paise;
  salaryDayOfMonth: number;
  currencyFormat: 'inr_lakhs' | 'standard';
}

export interface SecuritySettings {
  biometricLockEnabled: boolean;
  autoLockDuration: 'immediate' | '1m' | '5m';
  privacyCurtainEnabled: boolean;
}

export interface ExperienceSettings {
  hapticsEnabled: boolean;
  videoReactionsEnabled: boolean;
  threeVaultEnabled: boolean;
}

export interface ConnectedCard {
  id: string;
  bankName: string;
  cardTitle: string;
  accountNumberMasked: string;
  cardHolder: string;
  expiryStr: string;
  cardType: 'visa' | 'mastercard';
  colorGradient: [string, string];
  accentGlow: string;
  balancePaise: Paise;
  isCredit: boolean;
}
