import { parseFinancialSms } from '../src/domain/sms/parser.ts';

const T = Date.parse('2026-11-14T10:00:00+05:30');
type Case = { name: string; sender: string; body: string; expect: Record<string, unknown> | 'reject' };

const cases: Case[] = [
  { name: 'USER #1 Indian Bank credit by person', sender: 'AD-INDBNK-S',
    body: 'Your A/c *1681 is credited with Rs.1.00 on 14-11-26 by Mr M ARAVIND RAJ. RRN 631833500530. Available balance is Rs. 19492.38 - Indian Bank',
    expect: { direction: 'credit', amountPaise: 100, merchant: 'M Aravind Raj', accountLastFour: '1681', referenceNo: '631833500530', balancePaise: 1949238, bankCode: 'indian', suggestedCategoryId: 'cat_inc_other' } },
  { name: 'USER #2 Jio recharge receipt', sender: 'JM-JIOPAY',
    body: 'Recharge Successful !\nPlan Name : 629.00\nJio Number : 7339059057\nEntitlement : \nBenefits: Unlimited 5G data, 112GB(2GB/Day 4G Data), Unlimited Voice, 100 SMS/Day & Subscription to Jio Apps. Validity - 56 Days\nTransaction ID : BR000DTJGSV4\nView plan details - http://tiny.jio.com/dmyjioplans\nYou can check usage details for this recharge by clicking http://tiny.jio.com/dviewstatmnt',
    expect: { kind: 'merchant_receipt', direction: 'debit', amountPaise: 62900, merchant: 'Jio Recharge •9057', referenceNo: 'BR000DTJGSV4', suggestedCategoryId: 'cat_bills' } },
  { name: 'Indian Bank debit to VPA', sender: 'AD-INDBNK-S',
    body: 'Your A/c *1681 is debited with Rs.629.00 on 14-11-26 to jiomobility@hdfcbank. RRN 631833511111. Available balance is Rs. 18863.38 - Indian Bank',
    expect: { direction: 'debit', amountPaise: 62900, merchant: 'Jiomobility', accountLastFour: '1681', suggestedCategoryId: 'cat_bills' } },
  { name: 'Indian Bank debit to person', sender: 'AD-INDBNK-S',
    body: 'Your A/c *1681 is debited with Rs.250.00 on 14-11-26 to Mr K SURESH KUMAR. RRN 631833522222. Available balance is Rs. 18613.38 - Indian Bank',
    expect: { direction: 'debit', amountPaise: 25000, merchant: 'K Suresh Kumar' } },
  { name: 'SBI UPI debit (no currency)', sender: 'JD-SBIUPI-S',
    body: 'Dear UPI user A/C X4321 debited by 20.0 on date 14Nov26 trf to SARAVANA STORES Refno 631812345678. If not u? call 1800111109. -SBI',
    expect: { direction: 'debit', amountPaise: 2000, merchant: 'Saravana Stores', accountLastFour: '4321', referenceNo: '631812345678', bankCode: 'sbi' } },
  { name: 'SBI credit transfer from', sender: 'VM-SBIINB',
    body: 'Dear SBI User, your A/c X4321-credited by Rs.500 on 14Nov26 transfer from PRIYA S Ref No 631899999999 -SBI',
    expect: { direction: 'credit', amountPaise: 50000, merchant: 'Priya S', accountLastFour: '4321' } },
  { name: 'HDFC money sent', sender: 'VM-HDFCBK',
    body: 'Sent Rs.349.00 From HDFC Bank A/C *5566 To Swiggy On 14/11/26 Ref 631877777777 Not You? Call 18002586161/SMS BLOCK UPI to 7308080808',
    expect: { direction: 'debit', amountPaise: 34900, merchant: 'Swiggy', accountLastFour: '5566', suggestedCategoryId: 'cat_food' } },
  { name: 'HDFC credit from VPA', sender: 'VM-HDFCBK',
    body: 'Credit Alert! Rs.1500.00 credited to HDFC Bank A/c XX5566 on 14-11-26 from VPA ramesh.k@okaxis (UPI 631866666666)',
    expect: { direction: 'credit', amountPaise: 150000, merchant: 'Ramesh K', accountLastFour: '5566', referenceNo: '631866666666' } },
  { name: 'ICICI debit; NAME credited', sender: 'AX-ICICIB',
    body: 'ICICI Bank Acct XX123 debited for Rs 1,250.00 on 14-Nov-26; ZOMATO credited. UPI:631855555555. Call 18002662 for dispute.',
    expect: { direction: 'debit', amountPaise: 125000, merchant: 'Zomato', accountLastFour: '123', suggestedCategoryId: 'cat_food' } },
  { name: 'Axis UPI P2M path', sender: 'AD-AXISBK',
    body: 'INR 2,000.00 debited A/c no. XX9988 14-11-26, 10:15:02 UPI/P2M/631844444444/SHELL PETROL PUMP Not you? SMS BLOCKUPI Cust ID to 919951860002 Axis Bank',
    expect: { direction: 'debit', amountPaise: 200000, merchant: 'Shell Petrol Pump', accountLastFour: '9988', suggestedCategoryId: 'cat_transport' } },
  { name: 'Salary NEFT credit', sender: 'AD-INDBNK-S',
    body: 'Your A/c *1681 is credited with Rs.62,000.00 on 01-11-26 by NEFT-ACME TECH PVT LTD-SALARY NOV. Available balance is Rs. 70000.00 - Indian Bank',
    expect: { direction: 'credit', amountPaise: 6200000, merchant: 'Acme Tech Pvt Ltd', suggestedCategoryId: 'cat_income' } },
  { name: 'Refund credit', sender: 'VM-HDFCBK',
    body: 'Rs.499.00 refunded to your HDFC Bank A/c XX5566 on 14-11-26 by AMAZON. Ref 631833333333',
    expect: { direction: 'credit', amountPaise: 49900, merchant: 'Amazon', suggestedCategoryId: 'cat_inc_cashback' } },
  { name: 'ATM withdrawal', sender: 'JD-SBIINB',
    body: 'Rs.2000 withdrawn at SBI ATM S1CN000123 from A/c X4321 on 14Nov26 Txn No 631822222222. Avl Bal Rs 15000.00 -SBI',
    expect: { direction: 'debit', amountPaise: 200000, merchant: 'ATM Cash Withdrawal', accountLastFour: '4321', balancePaise: 1500000 } },
  { name: 'OTP rejected', sender: 'VM-HDFCBK', body: '123456 is your OTP for txn of Rs.500 at Amazon. Do not share.', expect: 'reject' },
  { name: 'Failed txn rejected', sender: 'VM-HDFCBK', body: 'Your txn of Rs.500 at Amazon has failed. Amount will be reversed.', expect: 'reject' },
  { name: 'Collect request rejected', sender: 'VM-SBIUPI', body: 'PRIYA has requested money from you on Google Pay. Rs 300', expect: 'reject' },
  { name: 'Bill due rejected', sender: 'VM-HDFCCC', body: 'Your HDFC Credit Card bill of Rs.4,200 is due on 20-11-26. Pay now.', expect: 'reject' },
  { name: 'Promo rejected', sender: 'VM-AXISBK', body: 'Congratulations! You are pre-approved for a loan of Rs 5,00,000. Apply now.', expect: 'reject' },
  { name: 'Recharge plan ad (no success) rejected', sender: 'JM-JIOINF', body: 'Recharge with Rs.349 plan and get 2GB/day. Click http://jio.com', expect: 'reject' },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const r = parseFinancialSms({ id: c.name, sender: c.sender, body: c.body, timestamp: T });
  const problems: string[] = [];
  if (c.expect === 'reject') {
    if (r.accepted) problems.push(`expected reject, got ${r.parsed?.direction} ${r.parsed?.amountPaise} "${r.parsed?.merchant}"`);
  } else if (!r.accepted || !r.parsed) {
    problems.push(`rejected: ${r.reason}`);
  } else {
    for (const [k, v] of Object.entries(c.expect)) {
      const got = (r.parsed as unknown as Record<string, unknown>)[k];
      if (got !== v) problems.push(`${k}: expected ${JSON.stringify(v)} got ${JSON.stringify(got)}`);
    }
  }
  if (problems.length) {
    fail++;
    console.log(`✗ ${c.name}\n    ${problems.join('\n    ')}`);
  } else {
    pass++;
    const p = r.parsed;
    console.log(`✓ ${c.name}${p ? `  →  ${p.direction} ₹${p.amountPaise / 100} "${p.merchant}" ${p.suggestedCategoryId} conf ${p.confidence.toFixed(2)}` : ''}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
