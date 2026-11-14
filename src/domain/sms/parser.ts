import { BankCode } from '@/domain/types';
import { Paise, toPaise } from '@/domain/money/paise';
import { ParsedFinancialSms, RawSmsMessage, SmsFilterResult } from './types';

// Map of common Indian DLT Sender prefixes/suffixes to BankCode
const BANK_HEADER_MAP: Record<string, BankCode> = {
  HDFCBK: 'hdfc',
  HDFC: 'hdfc',
  HDFCCC: 'hdfc',
  SBIINB: 'sbi',
  SBIPSG: 'sbi',
  SBMSMS: 'sbi',
  SBICRD: 'sbi',
  SBIUPI: 'sbi',
  ICICIB: 'icici',
  ICICIC: 'icici',
  ICICI: 'icici',
  AXISBK: 'axis',
  AXISCR: 'axis',
  AXIS: 'axis',
  INDBNK: 'indian',
  IDIBNK: 'indian',
  INDIAN: 'indian',
};

// Negative patterns that disqualify an SMS from being a valid financial transaction
const NEGATIVE_PATTERNS = [
  /\b(?:otp|one time password|verification code|secret code)\b/i,
  /\b(?:declined|failed|unsuccessful|cancelled|rejected)\b/i,
  /\b(?:request(?:ed)? to pay|collect request|mandate created)\b/i,
  /\b(?:pre-approved|apply now|congratulations|click here|congrats|exclusive offer)\b/i,
  /\b(?:reminder to pay|overdue alert|bill due)\b/i,
];

// Explicit Credit indicators
const CREDIT_PATTERNS = [
  /\b(?:credited|credited with|deposited|received|refunded|refund of|cashback of|cashback credited|salary credited|credited to)\b/i,
];

// Explicit Debit indicators
const DEBIT_PATTERNS = [
  /\b(?:debited|debited with|spent|paid|paid to|transferred to|withdrawn|purchase of|sent|charged)\b/i,
];

// Auto-categorization keyword map
const CATEGORY_KEYWORDS: { categoryId: string; patterns: RegExp[] }[] = [
  {
    categoryId: 'cat_food',
    patterns: [
      /\b(?:swiggy|zomato|mcdonald|kfc|starbucks|burger|cafe|chai|tea|restaurant|pizza|dominos|subway|bakery|diner|food)\b/i,
    ],
  },
  {
    categoryId: 'cat_groceries',
    patterns: [
      /\b(?:zepto|blinkit|instamart|bigbasket|dmart|supermarket|grocery|groceries|nature basket|reliance fresh|spencer|more retail)\b/i,
    ],
  },
  {
    categoryId: 'cat_transport',
    patterns: [
      /\b(?:uber|ola|rapido|metro|petrol|fuel|shell|indian oil|hpcl|bpcl|bharat petroleum|toll|fastag|irctc|redbus|railway)\b/i,
    ],
  },
  {
    categoryId: 'cat_shopping',
    patterns: [
      /\b(?:amazon|flipkart|myntra|ajio|zara|h&m|nykaa|croma|reliance digital|apple|tatacliq|retail|clothing|fashion|lifestyle)\b/i,
    ],
  },
  {
    categoryId: 'cat_utilities',
    patterns: [
      /\b(?:bescom|tneb|airtel|jio|vodafone|vi|broadband|electricity|water bill|gas bill|act fibernet|tata play|dth|recharge)\b/i,
    ],
  },
  {
    categoryId: 'cat_entertainment',
    patterns: [
      /\b(?:netflix|spotify|prime video|hotstar|bookmyshow|pvr|inox|cinema|youtube|disney|movie)\b/i,
    ],
  },
  {
    categoryId: 'cat_loans',
    patterns: [
      /\b(?:emi|loan instalment|loan repayment|bajaj finance|home loan|auto loan)\b/i,
    ],
  },
  {
    categoryId: 'cat_investment',
    patterns: [
      /\b(?:zerodha|groww|upstox|mutual fund|sip|kuvera|etmoney|nse|bse)\b/i,
    ],
  },
  {
    categoryId: 'cat_salary',
    patterns: [
      /\b(?:salary|payroll|stipend|wages)\b/i,
    ],
  },
];

export function parseFinancialSms(sms: RawSmsMessage): SmsFilterResult {
  const body = sms.body.trim();
  const sender = sms.sender.toUpperCase();

  // 1. Check for negative keywords (OTP, declined, promotions)
  for (const negRegex of NEGATIVE_PATTERNS) {
    if (negRegex.test(body)) {
      return { accepted: false, reason: 'Negative or non-transactional pattern detected' };
    }
  }

  // 2. Identify Bank Code from Sender Header or Body
  let bankCode: BankCode | undefined = undefined;
  for (const [header, code] of Object.entries(BANK_HEADER_MAP)) {
    if (sender.includes(header)) {
      bankCode = code;
      break;
    }
  }
  if (!bankCode) {
    if (/\b(?:sbi|state bank)\b/i.test(body)) bankCode = 'sbi';
    else if (/\bhdfc\b/i.test(body)) bankCode = 'hdfc';
    else if (/\bicici\b/i.test(body)) bankCode = 'icici';
    else if (/\baxis\b/i.test(body)) bankCode = 'axis';
    else if (/\b(?:indian bank|indusind)\b/i.test(body)) bankCode = 'indian';
  }

  // 3. Determine Direction (Debit vs Credit)
  let direction: 'debit' | 'credit' | null = null;
  const isCredit = CREDIT_PATTERNS.some((p) => p.test(body));
  const isDebit = DEBIT_PATTERNS.some((p) => p.test(body));

  if (isCredit && !isDebit) {
    direction = 'credit';
  } else if (isDebit && !isCredit) {
    direction = 'debit';
  } else if (isCredit && isDebit) {
    // If both exist, prioritize based on which appears first or has explicit phrasing
    const creditIndex = body.search(/credited|received|refund/i);
    const debitIndex = body.search(/debited|spent|paid/i);
    direction = creditIndex < debitIndex ? 'credit' : 'debit';
  } else {
    return { accepted: false, reason: 'Neither credit nor debit indicator found' };
  }

  // 4. Extract Amount
  // Matches: INR 1,234.50, Rs. 500, Rs 500.00, ₹450
  const amountMatch = body.match(
    /(?:INR|Rs\.?|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)|(?:debited by|credited by)\s*(?:INR|Rs\.?|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  );
  if (!amountMatch) {
    return { accepted: false, reason: 'No monetary amount found' };
  }

  const rawAmountStr = (amountMatch[1] || amountMatch[2] || '').replace(/,/g, '');
  const numericAmount = parseFloat(rawAmountStr);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return { accepted: false, reason: 'Invalid or zero amount parsed' };
  }
  const amountPaise = toPaise(numericAmount);

  // 5. Extract Account / Card Last Digits (3 or 4 digits)
  const accountMatch = body.match(
    /(?:a\/c|acct?|account|card)\s*(?:no\.?)?\s*(?:ending\s*(?:with\s*)?)?[x*]*(\d{3,4})|\bending\s*[x*]*(\d{3,4})\b|[x*]{2,}(\d{4})/i
  );
  const accountLastFour = accountMatch ? (accountMatch[1] || accountMatch[2] || accountMatch[3]) : undefined;

  // 6. Extract Reference / RRN / UPI Ref Number
  const refMatch = body.match(
    /(?:upi(?:\/|\s*ref(?:\s*no)?)?|rrn|ref(?:\s*no)?|txn(?:\s*id)?)\s*[:#\s]*([a-zA-Z0-9]{6,18})/i
  );
  const referenceNo = refMatch ? refMatch[1].trim() : undefined;

  // 7. Extract Merchant / Beneficiary
  let merchant = 'Unknown Merchant';
  // Common patterns: "to Swiggy on 14-Nov", "at Shell Petrol", "towards HDFC Loan", "info: ZOMATO"
  const merchantMatch = body.match(
    /(?:to|at|towards|for|vpa|info)\s+([A-Za-z0-9\s._\-@]{2,32}?)(?:\s+on|\s+ref|\s+via|\s+upi|\.|\,|$|\s+avl|\s+bal|\s+credited)/i
  );
  if (merchantMatch && merchantMatch[1]) {
    const rawMerchant = merchantMatch[1].trim();
    // Filter out generic filler words
    if (!/^(account|a\/c|your|bank|my|card|credit|debit)$/i.test(rawMerchant)) {
      merchant = cleanMerchantName(rawMerchant);
    }
  } else if (direction === 'credit' && /\bsalary\b/i.test(body)) {
    merchant = 'Monthly Salary Credit';
  } else if (direction === 'credit' && /\b(?:cashback|refund)\b/i.test(body)) {
    merchant = 'Refund / Cashback';
  }

  // 8. Suggest Category based on Merchant & Keywords
  let suggestedCategoryId = direction === 'credit' ? 'cat_income' : 'cat_other';
  for (const { categoryId, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((p) => p.test(body) || p.test(merchant))) {
      suggestedCategoryId = categoryId;
      break;
    }
  }

  // 9. Generate Deterministic Idempotency Key (Source Reference)
  let sourceRef: string;
  if (referenceNo) {
    sourceRef = `sms:rrn:${referenceNo.toLowerCase()}`;
  } else {
    // 5-minute bucket hash to avoid duplicates from SMS + Push notification arrival within minutes
    const bucket = Math.floor(sms.timestamp / (5 * 60 * 1000));
    sourceRef = `sms:fuzzy:${bankCode ?? 'unk'}:${accountLastFour ?? 'xxxx'}:${amountPaise}:${bucket}`;
  }

  const dateIso = new Date(sms.timestamp).toISOString();

  const parsed: ParsedFinancialSms = {
    isFinancial: true,
    type: direction,
    amountPaise,
    direction,
    merchant,
    bankCode,
    accountLastFour,
    referenceNo,
    suggestedCategoryId,
    confidence: referenceNo ? 0.95 : 0.85,
    sourceRef,
    dateIso,
    rawBody: body,
    sender,
  };

  return { accepted: true, parsed };
}

function cleanMerchantName(name: string): string {
  // Cleans UPI handles (e.g. "swiggy@icici" -> "Swiggy") and removes trailing punctuation
  let clean = name.replace(/[.,;:]+$/, '').trim();
  if (clean.includes('@')) {
    const parts = clean.split('@');
    if (parts[0] && parts[0].length >= 3) {
      clean = parts[0].replace(/[._-]/g, ' ');
    }
  }
  // Title Case
  return clean
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
