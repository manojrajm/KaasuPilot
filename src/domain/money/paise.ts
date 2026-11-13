/**
 * Money Integrity (ADR-002):
 * All amounts are stored and calculated as integer paise (1 Rupee = 100 paise).
 * Floating-point arithmetic on currency is strictly avoided.
 */

export type Paise = number;

/**
 * Converts a Rupee amount (e.g. 1240.50 or "1240.50") into integer paise.
 */
export function toPaise(rupees: number | string): Paise {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise into floating Rupee value.
 */
export function fromPaise(paise: Paise): number {
  return paise / 100;
}

/**
 * Safe integer addition for paise
 */
export function addPaise(a: Paise, b: Paise): Paise {
  return Math.round(a) + Math.round(b);
}

/**
 * Safe integer subtraction for paise
 */
export function subPaise(a: Paise, b: Paise): Paise {
  return Math.round(a) - Math.round(b);
}
