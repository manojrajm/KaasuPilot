import { BankCode, CardKind } from '@/domain/types';

export interface CardTheme {
  /** Gradient stops, top-left → bottom-right. */
  gradient: readonly [string, string, ...string[]];
  /** Main text colour (number, name). */
  text: string;
  /** Secondary text colour (labels such as VALID THRU). */
  subText: string;
  /** Accent used for the decorative stripe or wave. */
  accent: string;
}

export interface BankInfo {
  code: BankCode;
  name: string;
  shortName: string;
  /** Primary brand colour, used for chips and the account colour in lists. */
  brand: string;
  debit: CardTheme;
  credit: CardTheme;
}

/**
 * Colours follow each bank's brand palette as printed on their most common debit and
 * credit cards. Card designs vary by product, so these are close approximations.
 */
export const BANKS: Record<BankCode, BankInfo> = {
  sbi: {
    code: 'sbi',
    name: 'State Bank of India',
    shortName: 'SBI',
    brand: '#22409A',
    debit: {
      gradient: ['#1B3A8C', '#22409A', '#1E88E5'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.75)',
      accent: '#00B5EF',
    },
    credit: {
      gradient: ['#0B1F4D', '#152C6B', '#1B3A8C'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.7)',
      accent: '#00B5EF',
    },
  },
  indian: {
    code: 'indian',
    name: 'Indian Bank',
    shortName: 'Indian Bank',
    brand: '#1B3F8F',
    debit: {
      gradient: ['#14306E', '#1B3F8F', '#2A57B5'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.75)',
      accent: '#F7A800',
    },
    credit: {
      gradient: ['#0D1F47', '#14306E', '#1B3F8F'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.7)',
      accent: '#F7A800',
    },
  },
  hdfc: {
    code: 'hdfc',
    name: 'HDFC Bank',
    shortName: 'HDFC Bank',
    brand: '#004C8F',
    debit: {
      gradient: ['#003A70', '#004C8F', '#0A63B0'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.75)',
      accent: '#ED232A',
    },
    credit: {
      gradient: ['#0A0F1C', '#1A2233', '#2B3548'],
      text: '#F4F6FA',
      subText: 'rgba(244,246,250,0.65)',
      accent: '#ED232A',
    },
  },
  icici: {
    code: 'icici',
    name: 'ICICI Bank',
    shortName: 'ICICI Bank',
    brand: '#AE282E',
    debit: {
      gradient: ['#F37E20', '#D9531E', '#AE282E'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.8)',
      accent: '#FFD2A6',
    },
    credit: {
      gradient: ['#5A1015', '#7E1A20', '#AE282E'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.7)',
      accent: '#F37E20',
    },
  },
  axis: {
    code: 'axis',
    name: 'Axis Bank',
    shortName: 'AXIS BANK',
    brand: '#97144D',
    debit: {
      gradient: ['#7A0F3E', '#97144D', '#B5266A'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.75)',
      accent: '#F2B6CF',
    },
    credit: {
      gradient: ['#2A0716', '#4F0D2A', '#7A0F3E'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.7)',
      accent: '#E23E83',
    },
  },
  other: {
    code: 'other',
    name: 'Other Bank',
    shortName: 'BANK',
    brand: '#37474F',
    debit: {
      gradient: ['#263238', '#37474F', '#546E7A'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.7)',
      accent: '#90A4AE',
    },
    credit: {
      gradient: ['#101418', '#1C2329', '#2E3A42'],
      text: '#FFFFFF',
      subText: 'rgba(255,255,255,0.65)',
      accent: '#B0BEC5',
    },
  },
};

export const BANK_ORDER: BankCode[] = ['sbi', 'indian', 'hdfc', 'icici', 'axis', 'other'];

export function themeFor(bank: BankCode, kind: CardKind): CardTheme {
  return BANKS[bank][kind];
}
