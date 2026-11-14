import { Account, BankCode, CardKind, CardNetwork } from '@/domain/types';
import { BANKS } from '@/domain/cards/bankThemes';
import { digitsOnly } from '@/domain/cards/cardNumber';
import { Paise } from '@/domain/money/paise';
import { getDb } from '@/data/db/client';
import { cardVault, CardSecrets } from '@/services/cardVault';
import { createId } from '@/utils/id';
import { accountRepo } from './accountRepo';

export interface CardInput {
  bankCode: BankCode;
  /** Free-text bank name, used when bankCode is 'other'. */
  customBankName?: string;
  kind: CardKind;
  network: CardNetwork;
  holderName: string;
  number: string;
  expiry: string;
  cvv: string;
  /** Debit: current account balance. Credit: current outstanding (entered as a positive amount). */
  startingAmountPaise: Paise;
  creditLimitPaise?: Paise;
}

function displayName(input: Pick<CardInput, 'bankCode' | 'customBankName' | 'kind'>): string {
  const bank =
    input.bankCode === 'other' && input.customBankName?.trim()
      ? input.customBankName.trim()
      : BANKS[input.bankCode].shortName;
  return `${bank} ${input.kind === 'credit' ? 'Credit' : 'Debit'}`;
}

/** Credit cards start at minus the outstanding; debit cards at their balance. */
function openingBalance(input: Pick<CardInput, 'kind' | 'startingAmountPaise'>): Paise {
  const amount = Math.max(0, Math.round(input.startingAmountPaise));
  return input.kind === 'credit' ? -amount : amount;
}

export const cardRepo = {
  subscribe(callback: () => void) {
    return accountRepo.subscribe(callback);
  },

  /** The user's active cards with live balances. Secrets are not included. */
  async list(): Promise<Account[]> {
    const all = await accountRepo.getAll();
    return all.filter((a) => a.cardKind !== undefined);
  },

  async getById(id: string): Promise<Account | undefined> {
    const account = await accountRepo.getById(id);
    return account?.cardKind ? account : undefined;
  },

  async create(input: CardInput): Promise<Account> {
    const db = await getDb();
    const id = createId('card');
    const number = digitsOnly(input.number);
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO accounts
         (id, name, type, institution, last_four_digits, opening_balance_paise, color,
          card_kind, bank_code, network, holder_name, credit_limit_paise, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      displayName(input),
      input.kind === 'credit' ? 'card' : 'bank',
      input.bankCode === 'other' ? input.customBankName?.trim() || null : BANKS[input.bankCode].name,
      number.slice(-4),
      openingBalance(input),
      BANKS[input.bankCode].brand,
      input.kind,
      input.bankCode,
      input.network,
      input.holderName.trim().toUpperCase(),
      input.kind === 'credit' ? input.creditLimitPaise ?? null : null,
      now,
      now
    );

    try {
      await cardVault.save(id, { number, expiry: input.expiry, cvv: input.cvv });
    } catch (error) {
      // Never leave a card row whose secrets failed to save.
      await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
      throw error;
    }

    accountRepo.notifyChanged();
    const created = await accountRepo.getById(id);
    if (!created) throw new Error('Card was not saved');
    return created;
  },

  async update(id: string, input: CardInput): Promise<void> {
    const db = await getDb();
    const number = digitsOnly(input.number);
    await cardVault.save(id, { number, expiry: input.expiry, cvv: input.cvv });
    await db.runAsync(
      `UPDATE accounts SET
         name = ?, type = ?, institution = ?, last_four_digits = ?, opening_balance_paise = ?,
         color = ?, card_kind = ?, bank_code = ?, network = ?, holder_name = ?,
         credit_limit_paise = ?, updated_at = ?
       WHERE id = ?`,
      displayName(input),
      input.kind === 'credit' ? 'card' : 'bank',
      input.bankCode === 'other' ? input.customBankName?.trim() || null : BANKS[input.bankCode].name,
      number.slice(-4),
      openingBalance(input),
      BANKS[input.bankCode].brand,
      input.kind,
      input.bankCode,
      input.network,
      input.holderName.trim().toUpperCase(),
      input.kind === 'credit' ? input.creditLimitPaise ?? null : null,
      new Date().toISOString(),
      id
    );
    accountRepo.notifyChanged();
  },

  /** Opening balance as entered (positive outstanding for credit cards), for the edit form. */
  async getStartingAmount(id: string): Promise<Paise> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ opening_balance_paise: number }>(
      'SELECT opening_balance_paise FROM accounts WHERE id = ?',
      id
    );
    return Math.abs(row?.opening_balance_paise ?? 0);
  },

  /** Must only be called after the user has passed biometric/PIN verification. */
  async readSecrets(id: string): Promise<CardSecrets | null> {
    return cardVault.read(id);
  },

  /**
   * Removes the card and its secrets. A card with transactions or loans is archived instead,
   * so past entries keep their account name.
   */
  async remove(id: string): Promise<void> {
    const db = await getDb();
    const usage = await db.getFirstAsync<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM transactions WHERE account_id = ?)
            + (SELECT COUNT(*) FROM loans WHERE account_id = ?) AS n`,
      id,
      id
    );
    if ((usage?.n ?? 0) > 0) {
      await db.runAsync('UPDATE accounts SET is_archived = 1, updated_at = ? WHERE id = ?', new Date().toISOString(), id);
    } else {
      await db.runAsync('DELETE FROM accounts WHERE id = ?', id);
    }
    await cardVault.remove(id);
    accountRepo.notifyChanged();
  },
};
