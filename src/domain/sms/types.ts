import { BankCode } from '@/domain/types';
import { Paise } from '@/domain/money/paise';

export interface RawSmsMessage {
  id: string;
  sender: string;
  body: string;
  timestamp: number; // Unix epoch ms
}

export type FinancialSmsType = 'debit' | 'credit' | 'balance_inquiry' | 'otp' | 'unknown';

export interface ParsedFinancialSms {
  isFinancial: boolean;
  type: FinancialSmsType;
  amountPaise: Paise;
  direction: 'debit' | 'credit';
  merchant: string;
  bankCode?: BankCode;
  accountLastFour?: string;
  referenceNo?: string;
  balancePaise?: Paise;
  suggestedCategoryId: string;
  confidence: number; // 0.0 to 1.0
  sourceRef: string; // Unique deduplication key
  dateIso: string;
  rawBody: string;
  sender: string;
}

export interface SmsFilterResult {
  accepted: boolean;
  reason?: string;
  parsed?: ParsedFinancialSms;
}

export interface UnmatchedBankInfo {
  detectedBankCode: string;
  detectedLastFour: string;
}

/**
 * Checks if a pending transaction's note contains an unmatched bank marker
 * (e.g. `[UNMATCHED:HDFC:4410]`).
 */
export function extractUnmatchedBankInfo(note?: string): UnmatchedBankInfo | null {
  if (!note) return null;
  const match = note.match(/\[UNMATCHED:([^:]+):([^\]]+)\]/);
  if (!match) return null;
  return {
    detectedBankCode: match[1],
    detectedLastFour: match[2],
  };
}
