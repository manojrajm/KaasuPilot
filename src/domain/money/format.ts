import { Paise, fromPaise } from './paise';

export interface FormatOptions {
  prefix?: string;
  showPaise?: boolean;
  signDisplay?: 'auto' | 'always' | 'never';
}

/**
 * Formats a paise amount into Indian standard grouping:
 * e.g. 124000 paise -> "₹ 1,240"
 * e.g. 123456700 paise -> "₹ 12,34,567"
 */
export function formatPaise(paise: Paise, options: FormatOptions = {}): string {
  const { prefix = '₹ ', showPaise = false, signDisplay = 'auto' } = options;
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;

  // Indian number grouping regex: last 3 digits, then groups of 2
  const str = rupees.toString();
  let lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedRupees = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  let result = formattedRupees;
  if (showPaise && remainderPaise > 0) {
    result += `.${remainderPaise.toString().padStart(2, '0')}`;
  }

  let sign = '';
  if (isNegative) {
    sign = '- ';
  } else if (signDisplay === 'always') {
    sign = '+ ';
  }

  return `${sign}${prefix}${result}`;
}

/**
 * Compact Indian currency formatting for tight widgets and telemetry cards:
 * e.g. ₹ 1.2k, ₹ 4.5L, ₹ 2.1Cr
 */
export function formatCompactPaise(paise: Paise, prefix = '₹ '): string {
  const rupees = fromPaise(Math.abs(paise));
  const sign = paise < 0 ? '-' : '';

  if (rupees >= 10000000) {
    return `${sign}${prefix}${(rupees / 10000000).toFixed(1)}Cr`;
  }
  if (rupees >= 100000) {
    return `${sign}${prefix}${(rupees / 100000).toFixed(1)}L`;
  }
  if (rupees >= 1000) {
    return `${sign}${prefix}${(rupees / 1000).toFixed(1)}k`;
  }
  return `${sign}${prefix}${Math.round(rupees)}`;
}
