import { CASH_ACCOUNT_ID } from '@/data/db/client';
import { accountRepo } from '@/data/repositories/accountRepo';
import { transactionRepo } from '@/data/repositories/transactionRepo';
import { parseFinancialSms } from '@/domain/sms/parser';
import { RawSmsMessage } from '@/domain/sms/types';
import { Account, Transaction } from '@/domain/types';

export interface IngestSmsResult {
  accepted: boolean;
  isDuplicate?: boolean;
  reason?: string;
  transaction?: Transaction;
}

export const smsIngestionService = {
  /**
   * Ingests a raw SMS message, parses financial telemetry, resolves account,
   * and inserts it into the SQLite ledger with 'pending_review' status.
   * If a transaction with the same reference number or fuzzy hash exists,
   * it is safely discarded with `isDuplicate: true`.
   */
  async ingestSms(sms: RawSmsMessage): Promise<IngestSmsResult> {
    const parseResult = parseFinancialSms(sms);
    if (!parseResult.accepted || !parseResult.parsed) {
      return { accepted: false, reason: parseResult.reason || 'Not a valid financial SMS' };
    }

    const { parsed } = parseResult;

    // 1. Resolve Account: First try exact bank code + last 4 digits match
    let account = await accountRepo.findByBankAndLastFour(
      parsed.bankCode,
      parsed.accountLastFour
    );

    // 2. If no exact match, try matching by last 4 digits across all user's registered cards
    if (!account && parsed.accountLastFour) {
      const all = await accountRepo.getAll();
      account = all.find((a) => a.lastFourDigits === parsed.accountLastFour);
    }

    let isUnmatched = false;
    // 3. If STILL no match, DO NOT silently debit or credit the user's primary/salary account!
    // Flag it as an unmatched bank so the user can review and link an account before ledger confirmation.
    if (!account) {
      isUnmatched = true;
      account = await accountRepo.getById(CASH_ACCOUNT_ID);
      if (!account) {
        const all = await accountRepo.getAll();
        account = all[0];
      }
    }

    const accountId = account?.id ?? CASH_ACCOUNT_ID;
    const detectedBank = (parsed.bankCode || 'UNKNOWN').toUpperCase();
    const detectedLast4 = parsed.accountLastFour || '????';
    const note = isUnmatched
      ? `[UNMATCHED:${detectedBank}:${detectedLast4}] Auto-parsed from SMS: ${sms.sender}`
      : `Auto-parsed from SMS: ${sms.sender}`;

    // 4. Create Draft Transaction in SQLite Ledger
    const created = await transactionRepo.create(
      {
        accountId,
        amountPaise: parsed.amountPaise,
        direction: parsed.direction,
        categoryId: parsed.suggestedCategoryId,
        merchant: parsed.merchant,
        note,
        txnDate: parsed.dateIso,
        source: 'sms',
        status: 'pending_review',
        taxTag: null,
      },
      {
        sourceRef: parsed.sourceRef,
        notify: true,
      }
    );

    if (!created) {
      return {
        accepted: true,
        isDuplicate: true,
        reason: 'Duplicate reference detected (Transaction already logged in ledger)',
      };
    }

    return {
      accepted: true,
      isDuplicate: false,
      transaction: created,
    };
  },

  /** Sample SMS messages dynamically matching user's registered bank cards for realistic local testing */
  getSampleSms(userAccounts?: Account[]): RawSmsMessage[] {
    const now = Date.now();
    const cardAccount = userAccounts?.find((a) => a.type === 'card' || a.lastFourDigits);
    const bankName = cardAccount?.name || cardAccount?.institution || 'Indian Bank';
    const lastFour = cardAccount?.lastFourDigits || '4821';
    const bankHeader = bankName.toLowerCase().includes('sbi')
      ? 'JM-SBIINB'
      : bankName.toLowerCase().includes('indian')
      ? 'VK-INDBNK'
      : 'VK-MYBANK';

    return [
      {
        id: `sim_swiggy_${now}`,
        sender: bankHeader,
        body: `Dear Customer, INR 349.00 debited from ${bankName} A/c ending ${lastFour} on 14-Nov towards Swiggy via UPI Ref ${Math.floor(100000000000 + Math.random() * 900000000000)}. Avl bal INR 45,210.00.`,
        timestamp: now,
      },
      {
        id: `sim_petrol_${now}`,
        sender: bankHeader,
        body: `Your ${bankName} Card ending ${lastFour} has been charged INR 2,000.00 at SHELL PETROL on 14-Nov-26 via UPI Ref ${Math.floor(100000000000 + Math.random() * 900000000000)}.`,
        timestamp: now - 3600000,
      },
      {
        id: `sim_unmatched_hdfc_${now}`,
        sender: 'VK-HDFCBK',
        body: `Spent INR 640.00 on your HDFC Bank A/c XX4410 on 14-Nov at Blinkit via UPI. UPI Ref ${Math.floor(100000000000 + Math.random() * 900000000000)}.`,
        timestamp: now - 7200000,
      },
      {
        id: `sim_salary_${now}`,
        sender: bankHeader,
        body: `Dear Customer, your Salary of Rs. 62,000.00 is credited to your ${bankName} A/c ...${lastFour} on 01-Nov-26 by Employer Corp. Clear Bal: INR 68,500.00. Ref ${Math.floor(100000000000 + Math.random() * 900000000000)}.`,
        timestamp: now - 86400000,
      },
    ];
  },
};
