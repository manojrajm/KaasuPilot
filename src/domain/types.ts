import { Paise } from './money/paise';

export type TransactionDirection = 'debit' | 'credit';
export type TransactionSource = 'manual' | 'voice' | 'ocr' | 'sms';
export type TransactionStatus = 'confirmed' | 'pending_review' | 'ignored';

export interface Category {
  id: string;
  name: string;
  iconName: string;
  emoji: string;
  color: string;
  gradientColors: [string, string];
  categoryType?: 'expense' | 'income' | 'both';
  taxSection?: '80C' | '80D' | 'HRA' | null;
  isSystem: boolean;
  isArchived?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CardKind = 'debit' | 'credit';
export type CardNetwork = 'visa' | 'mastercard' | 'rupay' | 'amex' | 'diners' | 'unknown';
export type BankCode = 'sbi' | 'indian' | 'hdfc' | 'icici' | 'axis' | 'other';

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'wallet' | 'card';
  institution?: string;
  lastFourDigits?: string;
  currentBalancePaise: Paise;
  color: string;
  /** Set when this account is one of the user's payment cards. */
  cardKind?: CardKind;
  bankCode?: BankCode;
  network?: CardNetwork;
  holderName?: string;
  creditLimitPaise?: Paise;
}

export interface Transaction {
  id: string;
  accountId: string;
  amountPaise: Paise;
  direction: TransactionDirection;
  categoryId: string;
  merchant: string;
  note?: string;
  txnDate: string; // ISO-8601 string
  source: TransactionSource;
  status: TransactionStatus;
  taxTag?: '80C' | '80D' | 'HRA' | null;
}

export interface TransactionFilters {
  searchQuery?: string;
  direction?: 'all' | 'debit' | 'credit';
  categoryId?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// LOAN & EMI INTELLIGENCE (PHASE 2 DOMAIN)
// ==========================================
export type LoanType = 'home' | 'auto' | 'personal' | 'gold' | 'education';
export type LoanStatus = 'active' | 'closed';

export interface Loan {
  id: string;
  name: string;
  type: LoanType;
  lender: string;
  principalPaise: Paise;
  balancePaise: Paise;
  annualRateBps: number; // e.g. 850 = 8.50%
  tenureMonths: number;
  monthsPaid: number;
  startDate: string; // ISO date string
  emiPaise: Paise;
  dueDayOfMonth: number; // e.g. 16, 25
  accountId: string;
  status: LoanStatus;
  prepaymentsPaise?: Paise;
  processingFeePaise?: Paise;
  /** True when the user entered the bank's EMI instead of the calculated one. */
  emiIsCustom?: boolean;
}

export interface LoanAmortisationEntry {
  installmentNumber: number;
  dueDate: string; // ISO string
  principalComponentPaise: Paise;
  interestComponentPaise: Paise;
  remainingBalancePaise: Paise;
  status: 'paid' | 'pending' | 'overdue';
}

export type PrepaymentStrategy = 'reduce_tenure' | 'reduce_emi';

export interface PrepaymentImpact {
  lumpSumPaise: Paise;
  strategy: PrepaymentStrategy;
  totalInterestSavedPaise: Paise;
  monthsSaved: number;
  newTenureMonths: number;
  newEmiPaise: Paise;
  oldEndDate: string;
  newEndDate: string;
}

export interface DueCalendarEvent {
  id: string;
  title: string;
  amountPaise: Paise;
  dueDate: string; // YYYY-MM-DD
  dayOfMonth: number;
  type: 'loan_emi' | 'credit_card' | 'bill';
  sourceId: string;
  lenderOrMerchant: string;
  status: 'pending' | 'paid';
}
