import { Account } from '@/domain/types';
import type { BankCardProps } from './BankCard';

/** Maps a card account to the visual props of <BankCard>. */
export function cardPropsFromAccount(
  account: Account
): Pick<BankCardProps, 'bank' | 'customBankName' | 'kind' | 'network' | 'holderName' | 'lastFour'> {
  return {
    bank: account.bankCode ?? 'other',
    customBankName: account.bankCode === 'other' ? account.institution : undefined,
    kind: account.cardKind ?? 'debit',
    network: account.network ?? 'unknown',
    holderName: account.holderName ?? '',
    lastFour: account.lastFourDigits ?? '',
  };
}
