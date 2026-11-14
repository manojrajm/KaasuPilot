import type { BankCode } from '@/domain/types';
import type { Paise } from '@/domain/money/paise';

export interface RawSmsMessage {
  id: string;
  sender: string;
  body: string;
  timestamp: number; // Unix epoch ms
}

export type FinancialSmsType = 'debit' | 'credit' | 'balance_inquiry' | 'otp' | 'unknown';

/**
 * - `bank`: a bank/card alert (debit or credit on one of the user's accounts).
 * - `merchant_receipt`: a confirmation from a merchant/biller (e.g. Jio recharge). The money left a
 *   bank account too, so ingestion merges it with the matching bank debit instead of double-counting.
 */
export type SmsKind = 'bank' | 'merchant_receipt';

export interface ParsedFinancialSms {
  isFinancial: boolean;
  kind: SmsKind;
  type: FinancialSmsType;
  amountPaise: Paise;
  direction: 'debit' | 'credit';
  /** Person or business on the other side ("M Aravind Raj", "Swiggy", "Jio Recharge"). */
  merchant: string;
  /** True when no counterparty could be read and `merchant` is a placeholder. */
  merchantUnknown: boolean;
  bankCode?: BankCode;
  accountLastFour?: string;
  referenceNo?: string;
  /** Balance reported in the SMS after this transaction, if present. */
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
