import { CASH_ACCOUNT_ID } from '@/data/db/client';
import { accountRepo } from '@/data/repositories/accountRepo';
import { transactionRepo } from '@/data/repositories/transactionRepo';
import { formatPaise } from '@/domain/money/format';
import { parseFinancialSms } from '@/domain/sms/parser';
import { ParsedFinancialSms, RawSmsMessage } from '@/domain/sms/types';
import { Account, Transaction } from '@/domain/types';

export interface IngestSmsResult {
  accepted: boolean;
  isDuplicate?: boolean;
  reason?: string;
  transaction?: Transaction;
}

/** A receipt and its bank debit are treated as one payment when they arrive this close together. */
const RECEIPT_MATCH_WINDOW_MINUTES = 30;

const GENERIC_CATEGORIES = new Set(['cat_expense_other', 'cat_inc_other']);

function isGenericMerchant(t: Transaction): boolean {
  return t.merchant === 'Unknown Merchant' || /^UPI \d/.test(t.merchant);
}

/**
 * Finds the user's account for an SMS: bank + last 4 digits, then last 4 digits alone.
 * Never falls back to the salary account; an unknown account is flagged for the user instead.
 */
async function resolveAccount(parsed: ParsedFinancialSms): Promise<{ account?: Account; unmatched: boolean }> {
  let account = await accountRepo.findByBankAndLastFour(parsed.bankCode, parsed.accountLastFour);
  if (!account && parsed.accountLastFour) {
    const all = await accountRepo.getAll();
    account = all.find((a) => a.lastFourDigits === parsed.accountLastFour);
  }
  if (account) return { account, unmatched: false };
  const fallback = (await accountRepo.getById(CASH_ACCOUNT_ID)) ?? (await accountRepo.getAll())[0];
  return { account: fallback, unmatched: true };
}

function buildNote(parsed: ParsedFinancialSms, unmatched: boolean): string {
  const tag =
    parsed.kind === 'merchant_receipt'
      ? `[UNMATCHED:${parsed.merchant.split(' ')[0].toUpperCase()}:????] Receipt — no bank SMS yet; choose the account it was paid from.`
      : unmatched
      ? `[UNMATCHED:${(parsed.bankCode || 'UNKNOWN').toUpperCase()}:${parsed.accountLastFour || '????'}]`
      : '';
  const balance = parsed.balancePaise !== undefined ? ` · Avl bal ${formatPaise(parsed.balancePaise)}` : '';
  const ref = parsed.referenceNo ? ` · Ref ${parsed.referenceNo}` : '';
  return `${tag ? `${tag} ` : ''}Auto-parsed from SMS: ${parsed.sender}${ref}${balance}`;
}

export const smsIngestionService = {
  /**
   * Ingests a raw SMS: parses it, resolves the account and stores a `pending_review` draft.
   * - Duplicates (same reference or 5-minute fuzzy key) are discarded with `isDuplicate: true`.
   * - A merchant receipt (e.g. Jio recharge) and the bank debit for the same payment are merged
   *   into one transaction, so the expense is never counted twice: the bank SMS provides the
   *   account, the receipt provides the readable merchant name.
   */
  async ingestSms(sms: RawSmsMessage): Promise<IngestSmsResult> {
    const parseResult = parseFinancialSms(sms);
    if (!parseResult.accepted || !parseResult.parsed) {
      return { accepted: false, reason: parseResult.reason || 'Not a valid financial SMS' };
    }

    const { parsed } = parseResult;

    // 1. Merchant receipt → enrich the matching bank debit if it already arrived.
    if (parsed.kind === 'merchant_receipt') {
      const [bankTxn] = await transactionRepo.findSmsNear({
        amountPaise: parsed.amountPaise,
        direction: 'debit',
        aroundIso: parsed.dateIso,
        windowMinutes: RECEIPT_MATCH_WINDOW_MINUTES,
        receipts: false,
      });
      if (bankTxn) {
        // Do not overwrite names or categories the user already confirmed.
        if (bankTxn.status === 'pending_review' || isGenericMerchant(bankTxn)) {
          await transactionRepo.patch(bankTxn.id, {
            merchant: parsed.merchant,
            ...(GENERIC_CATEGORIES.has(bankTxn.categoryId) ? { categoryId: parsed.suggestedCategoryId } : {}),
          });
        }
        return { accepted: true, isDuplicate: true, reason: 'Merged merchant receipt into the matching bank debit' };
      }
    }

    // 2. Bank debit → complete a receipt that arrived first (adds the real account).
    if (parsed.kind === 'bank' && parsed.direction === 'debit') {
      const [receiptTxn] = await transactionRepo.findSmsNear({
        amountPaise: parsed.amountPaise,
        direction: 'debit',
        aroundIso: parsed.dateIso,
        windowMinutes: RECEIPT_MATCH_WINDOW_MINUTES,
        receipts: true,
      });
      if (receiptTxn) {
        const { account, unmatched } = await resolveAccount(parsed);
        await transactionRepo.patch(receiptTxn.id, {
          accountId: account?.id ?? CASH_ACCOUNT_ID,
          note: buildNote(parsed, unmatched),
        });
        return { accepted: true, isDuplicate: true, reason: 'Bank debit matched an existing merchant receipt' };
      }
    }

    const { account, unmatched } =
      parsed.kind === 'merchant_receipt'
        ? { account: await accountRepo.getById(CASH_ACCOUNT_ID), unmatched: true }
        : await resolveAccount(parsed);
    const accountId = account?.id ?? CASH_ACCOUNT_ID;
    const note = buildNote(parsed, unmatched);

    // 3. Create the draft transaction in the ledger
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
