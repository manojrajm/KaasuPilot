import type { BankCode } from '@/domain/types';
import type { ParsedFinancialSms, RawSmsMessage, SmsFilterResult, SmsKind } from './types';

/*
 * Bank / merchant SMS parser — pure, offline, deterministic.
 *
 * Pipeline:  normalise → reject non-transactions → classify (bank alert | merchant receipt)
 *            → direction → amount → account → reference → balance → counterparty → category
 *
 * Every extractor tries specific patterns first and generic ones last, and returns `undefined`
 * rather than guessing. Only type imports are used, so this file runs in plain Node for tests.
 */

/* ------------------------------------------------------------------------------------------ */
/* Senders                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** DLT sender headers (the 6-letter part of "AD-HDFCBK-S") → bank. */
const BANK_HEADERS: [RegExp, BankCode][] = [
  [/^(?:HDFCBK|HDFCBN|HDFCCC|HDFC)/, 'hdfc'],
  [/^(?:SBIINB|SBIPSG|SBMSMS|SBICRD|SBIUPI|SBIBNK|ATMSBI|CBSSBI|SBI)/, 'sbi'],
  [/^(?:ICICIB|ICICIC|ICICIT|ICICI)/, 'icici'],
  [/^(?:AXISBK|AXISCR|AXISMR|AXIS)/, 'axis'],
  [/^(?:INDBNK|INDIAN|INDBKL|IBANKS|IDIBNK)/, 'indian'],
  [/^(?:CANBNK|CNRBNK|BOBSMS|BOBTXN|BARBOD|KOTAKB|KOTAK|PNBSMS|PNBBNK|UNIONB|UBINBK|YESBNK|IDFCFB|FEDBNK|INDUSB|IOBCHN|CENTBK|BOIIND|PAYTMB|AIRBNK|AUBANK)/, 'other'],
];

/** Body mentions used when the sender header is unknown (e.g. forwarded or long-code SMS). */
const BANK_BODY_HINTS: [RegExp, BankCode][] = [
  [/\bindian\s+bank\b/i, 'indian'],
  [/\b(?:sbi|state\s+bank\s+of\s+india)\b/i, 'sbi'],
  [/\bhdfc\b/i, 'hdfc'],
  [/\bicici\b/i, 'icici'],
  [/\baxis\s+bank\b/i, 'axis'],
];

/** Merchants/billers whose own confirmation SMS we accept as a receipt. */
const RECEIPT_MERCHANTS: { sender: RegExp; body: RegExp; name: string; categoryId: string }[] = [
  { sender: /JIO/, body: /\bjio\b/i, name: 'Jio Recharge', categoryId: 'cat_bills' },
  { sender: /AIRTEL|ARTL/, body: /\bairtel\b/i, name: 'Airtel Recharge', categoryId: 'cat_bills' },
  { sender: /VIL|VICARE|VIINFO/, body: /\b(?:vi|vodafone\s+idea)\b/i, name: 'Vi Recharge', categoryId: 'cat_bills' },
  { sender: /BSNL/, body: /\bbsnl\b/i, name: 'BSNL Recharge', categoryId: 'cat_bills' },
];

/* ------------------------------------------------------------------------------------------ */
/* Classification                                                                             */
/* ------------------------------------------------------------------------------------------ */

/** Messages that look financial but are not completed transactions. */
const REJECT_PATTERNS: RegExp[] = [
  /\b(?:otp|one[\s-]time\s+password|verification\s+code|secret\s+code|cvv\s+is)\b/i,
  /\b(?:failed|unsuccessful|declined|rejected|could\s+not\s+be\s+processed)\b/i,
  /\b(?:requested\s+money|request(?:ed)?\s+to\s+pay|collect\s+request|has\s+requested)\b/i,
  /\b(?:mandate|autopay)\s+(?:created|registered|set\s*up|scheduled)\b/i,
  /\b(?:will\s+be\s+(?:debited|deducted|charged)|is\s+due|due\s+(?:on|date|by)|minimum\s+(?:amount\s+)?due|statement\s+(?:is\s+)?generated)\b/i,
  /\b(?:pre-?approved|apply\s+now|congratulations|congrats|exclusive\s+offer|win\s+(?:a|up\s+to)|limited\s+period|eligible\s+for)\b/i,
];

const RECEIPT_SUCCESS = /\b(?:recharge|bill\s+payment|payment)\s+(?:is\s+|was\s+|has\s+been\s+)?successful\b|\bsuccessfully\s+recharged\b/i;

/** Verbs that decide the direction. The earliest verb in the message wins. */
const DEBIT_VERB = /\b(?:debited|debit\s+of|spent|withdrawn|withdrawal\s+of|paid|sent|transferred\s+to|trf\s+to|purchase(?:d)?|charged|deducted|dr\b)/i;
const CREDIT_VERB = /\b(?:credited|received|deposited|refunded|refund\s+of|reversed|reversal\s+of|cashback|cr\b)/i;

/* ------------------------------------------------------------------------------------------ */
/* Value extractors                                                                           */
/* ------------------------------------------------------------------------------------------ */

const CURRENCY = String.raw`(?:INR|Rs\.?|₹)`;
const NUMBER = String.raw`(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)`;
const MONEY_VERB = String.raw`(?:debited|credited|spent|paid|sent|received|withdrawn|charged|deposited|refunded|reversed|deducted|transferred)`;

/** Exact rupees string → integer paise, without floating-point maths. */
export function rupeesToPaise(raw: string): number | undefined {
  const clean = raw.replace(/,/g, '').trim();
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(clean);
  if (!m) return undefined;
  const paise = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : undefined;
}

const BALANCE_CONTEXT = /(?:bal(?:ance)?|limit|avl|avail(?:able)?)\W*(?:is|of|:|-)?\W*$/i;

function extractAmount(body: string, kind: SmsKind): number | undefined {
  const ordered: RegExp[] = [
    // "credited with Rs.1.00", "debited by INR 500", "spent Rs 349"
    new RegExp(String.raw`${MONEY_VERB}\s+(?:(?:with|by|for|of|an?\s+amount\s+of)\s+)?${CURRENCY}\s*${NUMBER}`, 'i'),
    // "INR 349.00 debited", "Rs.500 has been credited"
    new RegExp(String.raw`${CURRENCY}\s*${NUMBER}\s+(?:has\s+been\s+|is\s+|was\s+)?${MONEY_VERB}`, 'i'),
    // SBI style without currency: "debited by 20.0"
    new RegExp(String.raw`(?:debited|credited)\s+(?:by|with|for)\s+${NUMBER}\b`, 'i'),
  ];
  if (kind === 'merchant_receipt') {
    // Jio puts the price in "Plan Name : 629.00"; others use Amount / MRP / "recharge of".
    ordered.push(
      new RegExp(String.raw`(?:amount|amt|plan(?:\s+name)?|mrp|price|recharge\s+(?:of|amount))\s*[:\-]?\s*${CURRENCY}?\s*${NUMBER}\b`, 'i')
    );
  }
  for (const re of ordered) {
    const m = re.exec(body);
    const paise = m ? rupeesToPaise(m[1]) : undefined;
    if (paise && paise > 0) return paise;
  }
  // Last resort: the first currency amount that is not a balance or limit.
  const any = new RegExp(String.raw`${CURRENCY}\s*${NUMBER}`, 'gi');
  for (const m of body.matchAll(any)) {
    const before = body.slice(Math.max(0, (m.index ?? 0) - 30), m.index);
    if (BALANCE_CONTEXT.test(before)) continue;
    const paise = rupeesToPaise(m[1]);
    if (paise && paise > 0) return paise;
  }
  return undefined;
}

function extractBalance(body: string): number | undefined {
  const m = new RegExp(
    String.raw`(?:avl\.?|avail(?:able)?\.?|clear|closing|total)?\s*bal(?:ance)?\.?\s*(?:is|:|-|of)?\s*${CURRENCY}\s*(-?)${NUMBER}`,
    'i'
  ).exec(body);
  if (!m) return undefined;
  const paise = rupeesToPaise(m[2]);
  return paise === undefined ? undefined : m[1] === '-' ? -paise : paise;
}

function extractAccountLastFour(body: string): string | undefined {
  const patterns = [
    // "A/c *1681", "A/C X1234", "Acct XX123", "A/c no. XX1234", "Card ending 4821", "AC ...1234"
    /\b(?:a\/c|ac|acct|account|card)\b\.?(?:\s*no\.?)?(?:\s*(?:ending(?:\s+(?:with|in))?|number))?\s*[:\-]?\s*[xX*.•]*\s*(\d{3,6})\b/i,
    /[xX*]{2,}(\d{3,4})\b/,
  ];
  for (const re of patterns) {
    const m = re.exec(body);
    if (m) return m[1].slice(-4);
  }
  return undefined;
}

function extractReference(body: string): string | undefined {
  const re =
    /\b(?:RRN|UTR|UPI\s*Ref(?:\.?\s*No)?|UPI|IMPS\s*Ref|NEFT\s*Ref|Ref(?:erence)?\.?\s*(?:No\.?|Number|ID)?|Txn\.?\s*(?:ID|No)|Transaction\s*ID|Order\s*ID)\b\.?\s*[:#\-]?\s*([A-Za-z0-9]{6,22})\b/gi;
  for (const m of body.matchAll(re)) {
    // A real reference has several digits; this skips words such as "UPI user".
    if (/\d{3,}/.test(m[1])) return m[1].toUpperCase();
  }
  return undefined;
}

/* ------------------------------------------------------------------------------------------ */
/* Counterparty                                                                               */
/* ------------------------------------------------------------------------------------------ */

const NAME = String.raw`((?!(?:INR|Rs\.?|₹)\s*\d)[A-Za-z0-9][A-Za-z0-9 .&'@_\-\/]{0,48}?)`;
/** Where a name ends: punctuation followed by a known keyword, a date, or the end of the message. */
// Dates are matched without a trailing \b because "14Nov26" has no word break after "14".
const NAME_END = String.raw`(?=\s*[.,;:()]?\s*(?:\b(?:RRN|UTR|Ref|Refno|UPI|IMPS|NEFT|RTGS|Txn|via|Avl|Avail|Available|Bal|Balance|Total|If|Not\s+you|Call|Info|SMS|is\s+credited|credited|debited|from\s+(?:your|a\/c))\b|\bon\s+(?:\d|date\b)|-\s*[A-Z][A-Za-z]*\s+Bank\b|$))`;

const CREDIT_PARTY: RegExp[] = [
  // "by NEFT-ACME TECH PVT LTD-SALARY NOV" / "IMPS/631811112222/PRIYA S/..."
  /\b(?:NEFT|IMPS|RTGS)[-\/](?:[A-Z0-9]{8,}[-\/])?([A-Za-z][A-Za-z .&']+?)(?:[-\/]|\.\s|\.$|$)/i,
  new RegExp(String.raw`\btransfer\s+from\s+${NAME}${NAME_END}`, 'i'),
  new RegExp(String.raw`\b(?:by|from|frm)\s+(?:VPA\s+|A\/c\s+)?${NAME}${NAME_END}`, 'i'),
  new RegExp(String.raw`\bInfo\s*[:\-]\s*${NAME}${NAME_END}`, 'i'),
];

const DEBIT_PARTY: RegExp[] = [
  /UPI\/P2[AMP]\/\d+\/([^/\n]+?)(?:\/|\s+Not\b|$)/i, // Axis: "UPI/P2A/123456/NAME/..."
  new RegExp(String.raw`;\s*${NAME}\s+credited\b`, 'i'), // ICICI: "...; NAME credited."
  new RegExp(
    String.raw`\b(?:trf\s+to|paid\s+to|sent\s+to|transferred\s+to|towards|to|at)\s+(?:VPA\s+|A\/c\s+|M\/s\.?\s+)?${NAME}${NAME_END}`,
    'i'
  ),
  new RegExp(String.raw`\bInfo\s*[:\-]\s*${NAME}${NAME_END}`, 'i'),
];

const GENERIC_PARTY =
  /^(?:your|you|yours|a\/c|ac|acct|account|card|bank|self|upi|neft|imps|rtgs|the|beneficiary|merchant|txn|transaction|savings|current|wallet)\b/i;

const HONORIFIC = /^(?:mr|mrs|ms|miss|dr|shri|smt|sri|m\/s)\.?\s+/i;

/** "swiggy@icici" → "Swiggy"; "MR M ARAVIND RAJ" → "M Aravind Raj"; masks phone-number handles. */
export function cleanCounterparty(raw: string): string | undefined {
  let s = raw.replace(/\s+/g, ' ').replace(/[\s.,;:\-\/]+$/, '').trim();
  s = s.replace(HONORIFIC, '');
  if (s.includes('@')) {
    const handle = s.split(/\s+/).find((w) => w.includes('@')) ?? s;
    const user = handle.split('@')[0];
    if (/^\d{10,}$/.test(user)) return `UPI ${user.slice(0, 2)}••••${user.slice(-4)}`;
    s = user.replace(/[._\-]+/g, ' ').replace(/\d+$/, '').trim();
  }
  if (!s || s.length < 2 || GENERIC_PARTY.test(s) || /^\d+$/.test(s)) return undefined;
  return s
    .split(' ')
    .map((w) => (w.length <= 1 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

function extractCounterparty(body: string, direction: 'debit' | 'credit'): string | undefined {
  for (const re of direction === 'credit' ? CREDIT_PARTY : DEBIT_PARTY) {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    for (const m of body.matchAll(new RegExp(re.source, flags))) {
      const name = cleanCounterparty(m[1]);
      if (name) return name;
    }
  }
  // Any UPI handle in the message.
  const vpa = /\b([a-z0-9][a-z0-9.\-_]{2,})@([a-z]{2,})\b/i.exec(body);
  return vpa ? cleanCounterparty(vpa[0]) : undefined;
}

/* ------------------------------------------------------------------------------------------ */
/* Category                                                                                   */
/* ------------------------------------------------------------------------------------------ */

/** Category ids must exist in src/data/seed/defaultCategories.ts. */
const DEBIT_CATEGORIES: [string, RegExp][] = [
  ['cat_food', /\b(?:swiggy|zomato|mcdonald'?s?|kfc|starbucks|burger|cafe|restaurant|pizza|domino'?s|subway|bakery|hotel\s+saravana|a2b)\b/i],
  ['cat_groceries', /\b(?:zepto|blinkit|instamart|bigbasket|dmart|supermarket|grocer(?:y|ies)|reliance\s+fresh|more\s+retail|jiomart)\b/i],
  ['cat_transport', /\b(?:uber|ola|rapido|metro|petrol|fuel|shell|indian\s+oil|iocl|hpcl|bpcl|toll|fastag)\b/i],
  ['cat_travel', /\b(?:irctc|redbus|makemytrip|goibibo|indigo|air\s*india|akasa|cleartrip|yatra|oyo)\b/i],
  ['cat_shopping', /\b(?:amazon|flipkart|myntra|ajio|meesho|nykaa|croma|reliance\s+digital|tata\s*cliq|decathlon)\b/i],
  ['cat_bills', /\b(?:recharge|jio(?:\s*mobility|mobility|pay|fiber|fibre)?|airtel|vodafone|bsnl|broadband|electricity|tneb|tangedco|bescom|water\s+bill|gas\s+(?:bill|cylinder)|indane|act\s+fibernet|tata\s+play|dth|postpaid)\b/i],
  ['cat_entertainment', /\b(?:netflix|spotify|prime\s+video|hotstar|jiocinema|bookmyshow|pvr|inox|youtube\s+premium)\b/i],
  ['cat_health', /\b(?:apollo|medplus|pharmacy|pharma|hospital|clinic|netmeds|1mg|pharmeasy|diagnostic)\b/i],
  ['cat_education', /\b(?:school|college|university|udemy|coursera|byju'?s?|tuition|exam\s+fee)\b/i],
  ['cat_emi', /\b(?:emi|loan\s+(?:instalment|repayment|a\/c)|bajaj\s+fin(?:ance|serv)?|home\s+loan|auto\s+loan)\b/i],
  ['cat_investment', /\b(?:zerodha|groww|upstox|mutual\s+fund|sip|kuvera|et\s*money|nps|ppf)\b/i],
];

const CREDIT_CATEGORIES: [string, RegExp][] = [
  ['cat_income', /\b(?:salary|sal\s+cr|payroll|stipend|wages)\b/i],
  ['cat_inc_cashback', /\b(?:cashback|refund(?:ed)?|reversal|reversed)\b/i],
  ['cat_inc_interest', /\b(?:interest|int\.?\s+pd|int\s+cr)\b/i],
  ['cat_investment', /\b(?:dividend|redemption|zerodha|groww|mutual\s+fund)\b/i],
];

function suggestCategory(direction: 'debit' | 'credit', merchant: string, body: string): string {
  const rules = direction === 'credit' ? CREDIT_CATEGORIES : DEBIT_CATEGORIES;
  for (const text of [merchant, body]) {
    for (const [id, re] of rules) if (re.test(text)) return id;
  }
  return direction === 'credit' ? 'cat_inc_other' : 'cat_expense_other';
}

/* ------------------------------------------------------------------------------------------ */
/* Entry point                                                                                */
/* ------------------------------------------------------------------------------------------ */

function headerOf(sender: string): string {
  // "AD-HDFCBK-S" → "HDFCBK"; "VM-JIOPAY" → "JIOPAY"; long codes stay as they are.
  const parts = sender.toUpperCase().split('-').filter(Boolean);
  return parts.length >= 2 ? parts[1] : parts[0] ?? '';
}

function detectBank(header: string, body: string): BankCode | undefined {
  for (const [re, code] of BANK_HEADERS) if (re.test(header)) return code;
  for (const [re, code] of BANK_BODY_HINTS) if (re.test(body)) return code;
  return undefined;
}

export function parseFinancialSms(sms: RawSmsMessage): SmsFilterResult {
  const rawBody = sms.body.trim();
  const body = rawBody.replace(/\s+/g, ' ');
  const sender = sms.sender.toUpperCase();
  const header = headerOf(sender);

  for (const re of REJECT_PATTERNS) {
    if (re.test(body)) return { accepted: false, reason: `Not a completed transaction (${re.source.slice(0, 40)}…)` };
  }

  const bankCode = detectBank(header, body);
  const receiptMerchant = !bankCode
    ? RECEIPT_MERCHANTS.find((m) => m.sender.test(header) || (RECEIPT_SUCCESS.test(body) && m.body.test(body)))
    : undefined;
  const isReceipt = !!receiptMerchant && RECEIPT_SUCCESS.test(body);
  const kind: SmsKind = isReceipt ? 'merchant_receipt' : 'bank';

  // Direction: a merchant receipt is always money out; otherwise the earliest verb wins.
  let direction: 'debit' | 'credit';
  if (isReceipt) {
    direction = 'debit';
  } else {
    const d = body.search(DEBIT_VERB);
    const c = body.search(CREDIT_VERB);
    if (d < 0 && c < 0) return { accepted: false, reason: 'No debit or credit verb found' };
    direction = c >= 0 && (d < 0 || c < d) ? 'credit' : 'debit';
  }

  const amountPaise = extractAmount(body, kind);
  if (!amountPaise) return { accepted: false, reason: 'No transaction amount found' };

  const accountLastFour = isReceipt ? undefined : extractAccountLastFour(body);
  const referenceNo = extractReference(body);
  const balancePaise = isReceipt ? undefined : extractBalance(body);

  let merchant: string | undefined;
  if (isReceipt && receiptMerchant) {
    const phone = /\b(\d{10})\b/.exec(body);
    merchant = phone ? `${receiptMerchant.name} •${phone[1].slice(-4)}` : receiptMerchant.name;
  } else if (direction === 'debit' && /\b(?:atm|cash\s+withdrawal)\b/i.test(body) && /\bwithdraw/i.test(body)) {
    merchant = 'ATM Cash Withdrawal';
  } else {
    merchant = extractCounterparty(body, direction);
  }
  if (!merchant && direction === 'credit' && /\bsalary\b/i.test(body)) merchant = 'Salary Credit';
  if (!merchant && direction === 'credit' && /\b(?:cashback|refund|reversal|reversed)\b/i.test(body)) merchant = 'Refund / Cashback';
  if (!merchant && direction === 'credit' && /\binterest\b/i.test(body)) merchant = 'Interest Credit';
  if (!merchant && /\b(?:atm|cash\s+withdrawal)\b/i.test(body)) merchant = 'ATM Cash Withdrawal';
  const merchantUnknown = !merchant;

  const suggestedCategoryId =
    isReceipt && receiptMerchant ? receiptMerchant.categoryId : suggestCategory(direction, merchant ?? '', body);

  // Idempotency key: the bank/merchant reference when present, otherwise a 5-minute bucket.
  const sourceRef = referenceNo
    ? `sms:${isReceipt ? 'rcpt' : 'rrn'}:${referenceNo.toLowerCase()}`
    : `sms:${isReceipt ? 'rcpt' : 'fuzzy'}:${bankCode ?? header.toLowerCase()}:${accountLastFour ?? 'xxxx'}:${amountPaise}:${Math.floor(sms.timestamp / 300_000)}`;

  const confidence = Math.min(
    0.99,
    0.55 +
      (referenceNo ? 0.15 : 0) +
      (accountLastFour ? 0.1 : 0) +
      (merchantUnknown ? 0 : 0.1) +
      (bankCode || isReceipt ? 0.05 : 0) +
      (balancePaise !== undefined ? 0.04 : 0)
  );

  const parsed: ParsedFinancialSms = {
    isFinancial: true,
    kind,
    type: direction,
    amountPaise,
    direction,
    merchant: merchant ?? 'Unknown Merchant',
    merchantUnknown,
    bankCode,
    accountLastFour,
    referenceNo,
    balancePaise,
    suggestedCategoryId,
    confidence,
    sourceRef,
    dateIso: new Date(sms.timestamp).toISOString(),
    rawBody,
    sender,
  };

  return { accepted: true, parsed };
}
