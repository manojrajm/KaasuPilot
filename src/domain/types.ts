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
}

export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'cash' | 'wallet' | 'card';
  institution?: string;
  lastFourDigits?: string;
  currentBalancePaise: Paise;
  color: string;
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
