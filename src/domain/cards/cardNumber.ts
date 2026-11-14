import { CardNetwork } from '@/domain/types';

/** Strips everything except digits. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** Luhn checksum used by every card network to catch typing mistakes. */
export function isValidLuhn(cardNumber: string): boolean {
  const digits = digitsOnly(cardNumber);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Detects the network from the card's leading digits (IIN ranges).
 * RuPay is checked before Mastercard/Visa because some RuPay ranges start with 6 and 8.
 */
export function detectNetwork(cardNumber: string): CardNetwork {
  const d = digitsOnly(cardNumber);
  if (d.length === 0) return 'unknown';
  const two = Number(d.slice(0, 2));
  const three = Number(d.slice(0, 3));
  const four = Number(d.slice(0, 4));
  const six = Number(d.slice(0, 6));

  if (/^(60|65|81|82|508|353|356)/.test(d)) return 'rupay';
  if (two === 34 || two === 37) return 'amex';
  if (two === 36 || two === 38 || (three >= 300 && three <= 305)) return 'diners';
  if ((two >= 51 && two <= 55) || (d.length >= 6 && six >= 222100 && six <= 272099)) {
    return 'mastercard';
  }
  if (four >= 2221 && four <= 2720) return 'mastercard';
  if (d.startsWith('4')) return 'visa';
  return 'unknown';
}

/** Expected number length for the network (Amex 15, Diners 14, others 16). */
export function expectedLength(network: CardNetwork): number {
  if (network === 'amex') return 15;
  if (network === 'diners') return 14;
  return 16;
}

/** Groups digits for display: "4821 2233 5566 4821" (Amex: 4-6-5). */
export function formatCardNumber(cardNumber: string, network: CardNetwork = detectNetwork(cardNumber)): string {
  const d = digitsOnly(cardNumber);
  if (network === 'amex') {
    return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  }
  return d.replace(/(.{4})/g, '$1 ').trim();
}

/** "•••• •••• •••• 4821" */
export function maskCardNumber(lastFour: string): string {
  return `•••• •••• •••• ${lastFour}`;
}

/** Validates "MM/YY" and that the card has not expired (cards are valid through the end of that month). */
export function validateExpiry(value: string, now: Date = new Date()): string | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(value.trim());
  if (!match) return 'Use MM/YY format';
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return 'Month must be 01–12';
  const endOfMonth = new Date(year, month, 1);
  if (endOfMonth.getTime() <= now.getTime()) return 'This card has expired';
  return null;
}

/** Turns typed digits into "MM/YY" as the user types. */
export function formatExpiryInput(value: string): string {
  const d = digitsOnly(value).slice(0, 4);
  return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`;
}
