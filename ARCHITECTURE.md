# Money Tracker: Product & Technical Architecture

| Field | Value |
|---|---|
| Document type | Solution Architecture & Scope Specification |
| Version | 1.0 (MVP + Pro scope) |
| Platform | React Native (Expo) — Android first, iOS (manual/voice/OCR features only) |
| Data model | Offline-first, on-device; no mandatory backend |
| Languages | English, Tamil (phase 1 UI); ₹ Indian number formatting |

---

## 1. Vision & Positioning

A privacy-first personal finance app for Indian users that focuses on **loans, EMIs and cash-flow clarity**. Most expense trackers stop at logging spend. This app answers three questions every day:

1. **How much can I safely spend today?**
2. **What do I owe, when is it due, and what is the fastest way to be debt-free?**
3. **Where is my money going, and what should I change?**

**Core principles**

- **Privacy by default**: all financial data stays on the device. Cloud backup is opt-in and end-to-end encrypted.
- **Money integrity**: no floating-point money. All amounts are stored as integer paise.
- **Explainable intelligence**: every insight shows the formula or rule behind it. No opaque AI guesses.
- **Human confirmation**: automation proposes; the user confirms. Nothing is silently written to the ledger from SMS, OCR or voice.

---

## 2. Scope

### 2.1 In scope — feature map

| # | Module | Feature | Phase |
|---|---|---|---|
| F0 | Core | Accounts (bank, cash, wallet, card) | P1 |
| F0 | Core | Manual expense & income entry | P1 |
| F0 | Core | Categories, custom categories, merchant rules | P1 |
| F0 | Core | Budgets (per-category monthly limit) | P1 |
| F0 | Core | Savings goals | P3 |
| **F1** | **Loan & EMI Intelligence** | Loan register with amortisation schedule | P2 |
| F1.1 | | EMI due-date deadline notifications | P2 |
| F1.2 | | Prepayment simulator (reduce tenure / reduce EMI) | P2 |
| F1.3 | | Loan comparison (APR incl. processing fee) | P2 |
| F1.4 | | Debt payoff planner (Snowball / Avalanche) | P2 |
| F1.5 | | Loan health score | P2 |
| **F2** | **Smart Automation** | SMS debit/credit detection (Android) | P1 |
| F2.1 | | Subscription detector | P3 |
| F2.2 | | Anomaly alerts (unusual spend) | P3 |
| F2.3 | | Credit card statement & due-date tracker | P3 |
| F2.4 | | Bill calendar (rent, electricity, insurance, EMI) | P3 |
| F2.5 | | Safe-to-spend engine | P3 |
| **F5** | **Input Made Effortless** | Voice entry ("Swiggy 250 food") | P4 |
| F5.1 | | Receipt scan via on-device OCR | P4 |
| F5.2 | | Android home-screen widget (safe-to-spend, next EMI) | P4 |
| **F6** | **Expense Summary** | Monthly summary with category breakdown | P3 |
| F6.1 | | Rule-based plain-language insights (Tamil + English) | P3 |
| F6.2 | | Net worth tracker (assets − liabilities) | P5 |
| F6.3 | | Tax helper: tag 80C/80D/etc., export PDF/Excel | P5 |
| **F7** | **Trust & Privacy** | Offline-first storage | P1 |
| F7.1 | | App lock (biometric + PIN) | P1 |
| F7.2 | | Encrypted backup & restore (local file + optional Google Drive) | P5 |
| F7.3 | | Transparent SMS log (what was read, what was ignored) | P1 |
| F7.4 | | Data retention controls & full wipe | P5 |

### 2.2 Out of scope (MVP)

- Bank account aggregation via AA (Account Aggregator) — planned for v2 after licensing review.
- Investment portfolio tracking (mutual funds, stocks).
- Multi-user cloud sync and real-time sharing (shared wallet is v2).
- iOS SMS auto-detection (not technically possible; iOS users use manual, voice, OCR).
- On-device LLM chat (v2 evaluation; MVP uses deterministic rule-based insights).

---

## 3. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | React Native 0.8x + **Expo** (dev-client / EAS Build) | Fast iteration; native modules still possible |
| Language | TypeScript (strict mode) | Type safety for money and domain logic |
| Navigation | **Expo Router** (file-based) | Deep links, typed routes |
| State | **Zustand** (UI state) + repositories as source of truth | Lightweight; avoids duplicating DB in memory |
| Local DB | **expo-sqlite** + **Drizzle ORM** | Relational queries for ledger, schedules, aggregates |
| Migrations | Drizzle Kit (versioned SQL migrations) | Repeatable, reviewable schema changes |
| Money math | **decimal.js** for computation, stored as integer paise | No float drift in EMI schedules |
| Validation | **Zod** | Runtime validation for imported/parsed data |
| Forms | react-hook-form + Zod resolver | Standard, performant |
| Charts | **victory-native** (Skia-backed) | Smooth charts, accessible |
| Notifications | **expo-notifications** (local, scheduled) | No server required |
| SMS ingest | **Custom Expo module (Kotlin)**: `BroadcastReceiver` for `SMS_RECEIVED` | Only reliable Android approach |
| Voice | **@react-native-voice/voice** (Android SpeechRecognizer, en-IN / ta-IN) | Free, on-device on most devices |
| OCR | **ML Kit Text Recognition** (on-device) | Free, private, offline |
| Widget | **Android AppWidget** (Kotlin), data via SharedPreferences | Native widget; RN cannot render widgets |
| Secure storage | **expo-secure-store** (Keychain / Keystore) | PIN hash, backup keys |
| Biometrics | **expo-local-authentication** | Fingerprint / face unlock |
| Crypto | **react-native-quick-crypto** (AES-256-GCM, PBKDF2/Argon2id) | Encrypted backup |
| Cloud backup (optional) | Google Drive **appDataFolder** via REST | User-owned, no our-server storage |
| Background work | expo-background-task (widget refresh, reminder re-scheduling) | OS-compliant |
| Testing | Jest (domain logic), React Native Testing Library, Maestro (E2E) | Domain math must be 100% unit tested |
| Static quality | ESLint, Prettier, Husky, commitlint | Consistent codebase |
| CI/CD | GitHub Actions + EAS Build & Submit | Reproducible builds |
| Crash reporting | Sentry, PII scrubbing enabled, opt-in | Stability without leaking finances |
| Analytics | None by default; opt-in, anonymous, aggregated events only | Privacy positioning |

**Explicitly not used:** a custom backend in MVP. Infrastructure cost and data-liability risk are reduced to zero for core features.

---

## 4. System Architecture

### 4.1 Layered view

```
┌───────────────────────────────────────────────────────────────────┐
│  PRESENTATION  (Expo Router screens, components, theme, i18n)      │
├───────────────────────────────────────────────────────────────────┤
│  APPLICATION  (Zustand stores, hooks, use-case orchestration)      │
├───────────────────────────────────────────────────────────────────┤
│  DOMAIN  (pure TypeScript, no React/RN imports, fully unit-tested) │
│  • money/      • loan/ (EMI, schedule, prepay, payoff, compare)    │
│  • sms/        • categorize/   • automation/ (subs, anomaly, card) │
│  • budget/ (safe-to-spend)   • voice/nlu   • summary/ • tax/      │
├───────────────────────────────────────────────────────────────────┤
│  DATA  (repositories → Drizzle → expo-sqlite; migrations)          │
├───────────────────────────────────────────────────────────────────┤
│  SERVICES  (notifications, sms-ingest, ocr, speech, backup,        │
│             app-lock, widget-sync, export)                         │
├───────────────────────────────────────────────────────────────────┤
│  NATIVE MODULES  (Kotlin: SmsReceiver, MLKit OCR bridge,           │
│                   AppWidget provider)  │ OS APIs (Keystore, bio)  │
└───────────────────────────────────────────────────────────────────┘
          │ (optional, user-initiated only)
          ▼
   Google Drive appDataFolder  ←  encrypted .mtbak file (AES-256-GCM)
```

### 4.2 Dependency rules

1. **Domain never imports** React, React Native, Expo, or the database. It receives plain data and returns plain data. This keeps the money logic testable in Node.
2. **Screens never call SQL.** They call hooks → repositories.
3. **Native modules are wrapped** in `src/native/*` TypeScript interfaces so they can be mocked.
4. **Services are the only place with side effects** (notifications, OS calls, network).

### 4.3 SMS ingestion pipeline (the riskiest flow)

```
Bank SMS arrives
   │
   ▼
[Kotlin SmsReceiver] ── filters by sender (DLT header pattern, e.g. XX-HDFCBK)
   │
   ▼
[smsIngest service] ── hashes body, checks sms_messages for duplicate
   │
   ▼
[sms/parser]  ── template registry (bank-specific regex) → ParsedTxn | null
   │              • direction: debit | credit
   │              • amount (paise), merchant/VPA, ref no, date
   │              • confidence score (0–1)
   ▼
[categorize]  ── merchant rules → learned rules → "Uncategorised"
   │
   ▼
Insert as status = pending_review  (never auto-confirmed in MVP)
   │
   ▼
SMS Inbox screen ── user Confirms / Edits / Ignores
   │
   ▼
Confirmed → transactions ledger; rule learned if user changed category
```

**Why "pending_review"?** Regex parsers break when banks change templates. A wrong auto-entry damages trust in the whole app. Confirmation costs one tap.

### 4.4 Sequence: EMI due-date reminder

```
App start / background tick
   → reminderScheduler.reconcile()
       → emi_schedule WHERE status = pending AND due_date within 60 days
       → for each: cancel old notification (by reminders.notification_id)
                    schedule T-2 days and T-0 notifications
                    save new notification_id
   → user marks EMI paid
       → repayment txn created (linked to schedule row)
       → remaining reminders for that row cancelled
```

---

## 5. Domain Logic Specifications

### 5.1 EMI calculation

Let `P` = principal (paise), `r` = monthly rate = annual_rate_bps / 12 / 10000, `n` = tenure in months.

```
EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)        (if r = 0: EMI = P / n)
```

- Computed with decimal.js at 20-digit precision; EMI rounded **up** to the nearest paise.
- Schedule: each row `interest = balance × r` (rounded to paise), `principal = EMI − interest`.
- **Final installment absorbs rounding difference** so the balance ends at exactly 0.
- Banks sometimes compute interest on daily reducing balance. The app shows a disclaimer and allows the user to enter the bank's actual EMI to override the calculated schedule.

### 5.2 Prepayment simulator

Input: loan, lump sum `X`, date, strategy (`REDUCE_TENURE` | `REDUCE_EMI`).

- **REDUCE_TENURE**: keep EMI, recompute remaining months `n'` from the outstanding balance after `X` is deducted.
- **REDUCE_EMI**: keep tenure, recompute EMI on the new balance.
- Output: interest saved, months saved, new EMI, new end date, and a before/after comparison.

### 5.3 Loan comparison (approximate APR)

- Net disbursed amount = `P − processing_fee`.
- Find monthly rate `r*` such that `Σ EMI / (1 + r*)^k = P − fee` for k = 1..n (solved by bisection, 60 iterations max).
- `APR = r* × 12`.
- Compare loans on: EMI, total payable, total interest, **APR**, prepayment penalty.

### 5.4 Debt payoff planner

- **Snowball**: sort loans by outstanding balance ascending.
- **Avalanche**: sort by interest rate descending.
- Simulate month by month: pay minimum EMI on all loans, put `extra_budget` on the target loan. When a loan closes, its EMI rolls into the next target.
- Output: payoff date per loan, total interest, comparison of the two strategies.

### 5.5 Loan health score (0–100)

| Component | Weight | Rule |
|---|---|---|
| EMI-to-income ratio | 40 | ≤ 30% → full; 30–50% → linear drop; > 50% → 0 |
| Emergency buffer | 25 | Liquid savings in months of EMI+essentials: ≥ 6 → full |
| Prepayment discipline | 15 | Share of EMIs paid on time, last 12 months |
| Debt concentration | 10 | Single loan > 60% of total debt → penalty |
| High-interest exposure | 10 | Share of debt above 15% p.a. |

Score is shown with each component's contribution, so the user sees exactly what to improve.

### 5.6 Safe-to-spend engine

```
committed_outflows = Σ(EMI due before next income date)
                   + Σ(card min-due due before next income date)
                   + Σ(subscriptions due before next income date)
                   + Σ(bills due before next income date)
savings_reserve    = Σ(monthly contribution to active goals)
available          = Σ(account balances) − committed_outflows − savings_reserve
safe_to_spend_today = max(0, available) / max(1, days_until_next_income)
```

- "Next income date" = last detected salary credit + 1 month (user can override).
- Shows a warning if `available < 0`.

### 5.7 Subscription detection

- Group debits by normalised merchant/VPA.
- Qualify if ≥ 3 occurrences with amount variance ≤ 5%.
- Interval classification: 28–32 days → monthly; 360–370 days → yearly; 6–8 days → weekly.
- Status: `detected` → user confirms / ignores / marks cancelled.

### 5.8 Anomaly detection

- Per category, compute mean and standard deviation of the trailing 90 days (minimum 6 data points).
- Flag a transaction if `amount > mean + 2.5σ` **and** `amount > ₹500` (floor avoids noise on tiny amounts).
- Also flag first-time merchants above a configurable threshold.
- Alerts are local notifications, rate-limited to 1 per day.

### 5.9 Credit card cycle tracker

- Inputs: statement day, due day, total due, minimum due, credit limit.
- Derived: days to due, utilisation % = outstanding / limit (warn > 30%).
- Statement parsed from SMS when a template exists, otherwise entered manually.

### 5.10 Voice NLU (rule-based, offline)

Input: transcript string. Output: `{ amount, direction, category, merchant, date }`.

- Amount: first number token (digits; "ஐந்நூறு" Tamil number words in phase 4.2).
- Direction: keywords "received / vandhadhu / credit" → credit; default debit.
- Category: keyword dictionary (`food`, `swiggy`, `petrol` → Travel, etc.).
- Date: "today / yesterday / நேற்று" → relative date.
- Always shown in a confirm sheet before saving.

### 5.11 OCR receipt parsing

- ML Kit returns text blocks → heuristics:
  - Total: line containing "total / grand total / amount" with the largest valid amount after it.
  - Date: first matching `dd/mm/yyyy`, `dd-mmm-yy` pattern.
  - Merchant: first non-numeric line with ≥ 3 letters.
- Confidence per field. Fields below threshold are left blank for the user.

### 5.12 Summary & narrative insights

- Aggregates computed in SQL (`GROUP BY category, month`).
- Insights are **deterministic templates**, for example:
  - "உணவுக்கான செலவு கடந்த மாதத்தை விட {x}% அதிகம்" / "Food spend is {x}% higher than last month."
  - "EMI உங்கள் வருமானத்தில் {y}% (பரிந்துரை ≤ 30%)" / "EMIs take {y}% of income (guideline ≤ 30%)."
- No LLM in MVP: outputs are reproducible, explainable and work offline.

### 5.13 Net worth & tax helper

- Net worth = Σ asset balances (accounts, investments entered manually) − Σ outstanding loans − Σ card outstanding.
- Tax tags: each expense/income can be tagged (80C, 80D, HRA, etc.). Export groups tagged items by section with totals; the export is labelled as a summary, not tax advice.

---

## 6. Data Model

**Conventions**: all IDs are UUID v7 (sortable). All money columns are `INTEGER` paise. Rates are `INTEGER` basis points (9.25% = 925). Dates are ISO-8601 text in the local timezone with a stored offset. Every table has `created_at`, `updated_at`.

```
accounts(id, name, type[bank|cash|wallet|card], opening_balance_paise, is_archived)

categories(id, name, icon, color, parent_id NULL, is_system, tax_section NULL)

transactions(
  id, account_id FK, amount_paise CHECK(amount_paise > 0),
  direction[debit|credit], category_id FK, merchant, note,
  txn_date, source[manual|voice|ocr|sms], source_ref UNIQUE NULL,
  status[confirmed|pending_review|ignored],
  loan_schedule_id NULL FK, subscription_id NULL FK,
  tax_tag NULL
)

category_rules(id, match_type[merchant|keyword|vpa], pattern,
               category_id FK, priority, learned BOOLEAN)

sms_messages(id, sender, body_hash UNIQUE, body_encrypted NULL,
             received_at, parse_status[parsed|ignored|failed],
             transaction_id NULL FK, retention_until)

loans(id, name, lender, principal_paise, annual_rate_bps,
      tenure_months, start_date, emi_paise, emi_is_custom BOOLEAN,
      processing_fee_paise, due_day, account_id FK, status[active|closed])

emi_schedule(id, loan_id FK, installment_no, due_date,
             opening_balance_paise, interest_paise, principal_paise,
             closing_balance_paise, status[pending|paid|overdue|prepaid],
             paid_txn_id NULL FK)

loan_prepayments(id, loan_id FK, amount_paise, prepay_date,
                 strategy[reduce_tenure|reduce_emi])

credit_cards(id, name, credit_limit_paise, statement_day, due_day,
             min_due_percent)

card_statements(id, card_id FK, cycle_start, cycle_end,
                total_due_paise, min_due_paise, due_date, paid_status)

subscriptions(id, merchant_key, expected_amount_paise,
              cycle[weekly|monthly|yearly], next_expected_date,
              status[detected|confirmed|ignored|cancelled])

budgets(id, category_id FK, monthly_limit_paise, effective_from)

goals(id, name, target_paise, saved_paise, target_date, monthly_contribution_paise)

reminders(id, kind[emi|card|subscription|bill], ref_id,
          fire_at, notification_id, status)

assets(id, name, type[investment|property|other], value_paise, as_of)

settings(key PRIMARY KEY, value_json)   -- includes lock settings (hash only in SecureStore)
```

**Indexes**: `transactions(txn_date)`, `transactions(category_id, txn_date)`, `emi_schedule(loan_id, due_date)`, `sms_messages(body_hash)`, `reminders(fire_at)`.

**Integrity**: foreign keys on; `CHECK` constraints on amounts and rates; triggers keep `loans.emi_paise` consistent with schedule when a custom EMI is set.

---

## 7. Native Modules

| Module | Platform | Responsibility | Interface (TS) |
|---|---|---|---|
| `sms-receiver` | Android | Register `BroadcastReceiver` for `SMS_RECEIVED`, emit body + sender to JS, queue when app killed (WorkManager) | `onSms(cb)`, `isPermissionGranted()`, `requestPermission()` |
| `ocr` | Android/iOS | Wrap ML Kit text recognition, return blocks + confidence | `recognize(imageUri): Promise<OcrResult>` |
| `money-widget` | Android | AppWidgetProvider, reads SharedPreferences snapshot | `publishSnapshot(json)` |
| `secure-prefs` | Android/iOS | Helpers around Keystore-backed storage | (use expo-secure-store where possible) |

**Permissions (Android manifest, via config plugin)**: `RECEIVE_SMS`, `READ_SMS` (only when the user enables SMS features), `POST_NOTIFICATIONS`, `USE_BIOMETRIC`, `RECORD_AUDIO` (voice), `INTERNET` (only for optional backup).

**Permission UX**: explain the purpose before the system prompt. SMS permission is requested **only** when the user turns on automation, never on first launch.

---

## 8. Security & Privacy

| Area | Control |
|---|---|
| Data at rest | SQLite file stored in app sandbox. Optional SQLCipher build for DB-level encryption (decision in ADR-004). |
| Keys | Backup key derived from user passphrase with Argon2id (fallback PBKDF2 ≥ 600k iterations). Never stored; PIN hash in SecureStore. |
| App lock | Biometric first, PIN fallback. Auto-lock after 60 s in background. Screenshots blocked on sensitive screens (`FLAG_SECURE`). |
| Backup | AES-256-GCM, random 96-bit nonce per backup, versioned header, integrity tag verified before restore. |
| Google Drive | `drive.appdata` scope only (app cannot see the user's other files). Token stored in SecureStore. |
| SMS data | Raw body stored encrypted and auto-purged after retention (default 30 days, configurable, can be 0). Only hashes kept long-term for dedupe. |
| Logging | No amounts, merchants or SMS bodies in logs. Sentry `beforeSend` scrubs all financial fields. |
| Network | Zero network calls unless user enables backup. Certificate pinning for Google APIs. |
| Wipe | "Delete all data" removes DB, SecureStore keys and widget snapshot; confirmed with passphrase. |
| Compliance | DPDP Act 2023 aligned: consent screens, purpose limitation, right to erase, data export. Privacy policy published before launch. |
| Threat notes | Rooted devices: warn user, do not block. Shoulder surfing: lock-on-background + widget shows only safe-to-spend number, not balances. |

---

## 9. Screens & Wireframes

### 9.1 Screen inventory

| Group | Screen | Route | Key content |
|---|---|---|---|
| Onboarding | Welcome & privacy promise | `/onboarding` | Local-first explanation, permissions opt-in |
| Onboarding | Setup accounts, salary day | `/onboarding/setup` | Accounts, salary date, first budget |
| Security | Lock screen | `/lock` | Biometric / PIN |
| Security | Set PIN | `/settings/lock` | PIN, auto-lock timer |
| Tabs | **Home dashboard** | `/` | Safe-to-spend, next EMI, alerts, cash-flow |
| Tabs | Transactions | `/transactions` | Search, filters, grouped by day |
| Tabs | Loans | `/loans` | Loan cards, total outstanding, health score |
| Tabs | Summary | `/summary` | Monthly report, category chart, insights |
| Tabs | More | `/more` | Cards, bills, subscriptions, net worth, tax, settings |
| Input | Add transaction | `/transaction/new` | Manual form |
| Input | Voice entry | `/voice` | Mic, live transcript, confirm sheet |
| Input | Receipt scan | `/scan` | Camera, detected fields, edit |
| Automation | SMS inbox | `/sms-inbox` | Pending parsed txns: confirm / edit / ignore |
| Automation | Subscriptions | `/subscriptions` | Detected, confirmed, cancelled |
| Automation | Anomalies | `/anomalies` | Flagged spends with reason |
| Automation | Credit cards | `/cards`, `/cards/[id]` | Statement, due date, utilisation |
| Automation | Bill calendar | `/bills` | Month calendar with due items |
| Loans | Loan detail | `/loan/[id]` | Summary, EMI schedule, paid/pending |
| Loans | Add / edit loan | `/loan/new` | Principal, rate, tenure, fee, due day |
| Loans | Prepayment simulator | `/loan/[id]/prepay` | Lump sum, strategy, before/after |
| Loans | Loan comparison | `/loan/compare` | Up to 3 loans side by side |
| Loans | Payoff planner | `/loan/payoff` | Snowball vs Avalanche |
| Loans | Loan health | `/loan/health` | Score and component breakdown |
| Summary | Net worth | `/networth` | Assets, liabilities, trend |
| Summary | Tax helper | `/tax` | Tags, sections, export |
| Settings | Privacy & SMS log | `/settings/privacy` | Permissions, SMS log, retention |
| Settings | Backup & restore | `/settings/backup` | Local file, Google Drive |
| Settings | Notifications | `/settings/notifications` | Reminder lead times |
| Settings | Categories & rules | `/settings/categories` | Edit categories and merchant rules |

### 9.2 Home dashboard

```
┌─────────────────────────────────────────┐
│ ☰  Home                      🔒  ⚙      │
├─────────────────────────────────────────┤
│  SAFE TO SPEND TODAY                    │
│        ₹ 1,240                          │
│  ───────────────────────────────────    │
│  Days to next salary: 9                 │
│  Committed before salary: ₹ 18,600      │
│   (EMI ₹12,000 · Card ₹4,200 · Subs ₹2,400) │
├─────────────────────────────────────────┤
│  ⚠ Alerts                               │
│  • Home loan EMI due in 2 days          │
│  • Unusual spend: ₹3,450 at "XYZ Mart"  │
├─────────────────────────────────────────┤
│  NEXT EMI                               │
│  Car loan  ₹8,450     due 16 Nov   [Pay]│
│  Loan health  72/100        [View ›]    │
├─────────────────────────────────────────┤
│  THIS MONTH                             │
│  Income ₹62,000   Spent ₹38,900         │
│  [████████████░░░░░░]  63% of budget    │
├─────────────────────────────────────────┤
│  SMS inbox (3 new)  ›                   │
│  Recent                                 │
│  Swiggy          − ₹ 412    Food   Today│
│  Salary          + ₹62,000  Income 1 Nov │
├─────────────────────────────────────────┤
│   🏠     💳     ➕     📊     ⋯          │
│  Home  Txns  Add  Summary  More         │
└─────────────────────────────────────────┘
```

### 9.3 Add / voice entry

```
┌─────────────────────────────────────────┐
│ ✕   Add transaction                     │
├─────────────────────────────────────────┤
│  [ Manual ]  [ 🎤 Voice ]  [ 📷 Scan ]   │
├─────────────────────────────────────────┤
│                                         │
│        ◉  Listening…                    │
│   "swiggy two hundred fifty food"       │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ Amount     ₹ 250                  │  │
│  │ Type       Debit                  │  │
│  │ Category   Food ▾                 │  │
│  │ Merchant   Swiggy                 │  │
│  │ Date       Today                  │  │
│  └───────────────────────────────────┘  │
│                                         │
│        [   Cancel   ]  [  Save  ✓ ]     │
└─────────────────────────────────────────┘
```

### 9.4 SMS inbox (review queue)

```
┌─────────────────────────────────────────┐
│ ←  SMS inbox                 Settings ⚙ │
├─────────────────────────────────────────┤
│  3 pending · Parsed from bank SMS       │
├─────────────────────────────────────────┤
│  ▣ − ₹ 1,180   HDFCBK · 12 Nov          │
│    Merchant: AMAZON PAY                 │
│    Suggested: Shopping   Confidence 92% │
│    [Ignore]  [Edit]  [✓ Confirm]        │
├─────────────────────────────────────────┤
│  ▣ + ₹ 15,000  SBIINB · 11 Nov          │
│    Merchant: ACME PVT LTD (NEFT)        │
│    Suggested: Income    Confidence 88%  │
│    [Ignore]  [Edit]  [✓ Confirm]        │
├─────────────────────────────────────────┤
│  ▣ − ₹ 8,450   ICICIB · 10 Nov          │
│    Suggested: EMI (matched: Car loan)   │
│    [Ignore]  [Edit]  [✓ Confirm]        │
└─────────────────────────────────────────┘
```

### 9.5 Loan detail & EMI schedule

```
┌─────────────────────────────────────────┐
│ ←  Car loan                    ⋯ More   │
├─────────────────────────────────────────┤
│  Outstanding          ₹ 3,42,180        │
│  EMI ₹8,450  · Due 16 of every month    │
│  Rate 9.25%  · 36 of 60 months paid     │
│  Ends  Mar 2030                          │
│  [████████████████░░░░░░]  60%          │
├─────────────────────────────────────────┤
│  [ Schedule ]  [ Prepay ]  [ Insights ] │
├─────────────────────────────────────────┤
│  #   Due       EMI     Interest  Balance│
│  36  16 Oct    8,450   2,640     3,42,180 ✓│
│  37  16 Nov    8,450   2,637     3,40,367 ⏳│
│  38  16 Dec    8,450   2,617     3,38,534  │
│  …                                       │
│  [ Mark paid ]   [ Set reminder ⏰ ]     │
└─────────────────────────────────────────┘
```

### 9.6 Prepayment simulator

```
┌─────────────────────────────────────────┐
│ ←  Prepayment simulator                 │
├─────────────────────────────────────────┤
│  Lump sum        ₹ [ 50,000 ]           │
│  Pay on          [ 20 Nov 2026 ]        │
│  Strategy        (•) Reduce tenure      │
│                  ( ) Reduce EMI         │
├─────────────────────────────────────────┤
│              BEFORE        AFTER        │
│  Tenure      60 mo         52 mo        │
│  EMI         ₹8,450        ₹8,450       │
│  Interest    ₹ 2,14,000    ₹ 1,79,300   │
│  Saved                    ₹ 34,700 ✓   │
├─────────────────────────────────────────┤
│  ⓘ Assumes no prepayment charges.       │
│     Actual bank schedule may differ.    │
│        [ Save as plan ]                 │
└─────────────────────────────────────────┘
```

### 9.7 Loan comparison & payoff planner

```
┌─────────────────────────────────────────┐
│ ←  Compare loans                        │
├─────────────────────────────────────────┤
│              Loan A    Loan B    Loan C │
│  Principal   5,00,000  5,00,000  5,00,000│
│  Rate        10.5%     11.0%     10.0%  │
│  Fee         ₹ 5,000   ₹ 0       ₹ 10,000│
│  EMI         10,680    10,870    10,625 │
│  Total int.  1,91,000  2,06,000  1,88,000│
│  APR (eff.)  11.0%     11.0%     10.6%  │
│  Best ✓                                 │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ←  Payoff planner        Extra ₹ 5,000/mo│
├─────────────────────────────────────────┤
│  (•) Avalanche  ( ) Snowball            │
│  Debt-free date:  Jun 2031              │
│  Interest saved vs minimum: ₹ 1,42,000  │
│  1. Credit card  @ 36%   → Mar 2028     │
│  2. Personal loan @ 14%  → Oct 2029     │
│  3. Car loan     @ 9.25% → Jun 2031     │
└─────────────────────────────────────────┘
```

### 9.8 Summary (expense summary & insights)

```
┌─────────────────────────────────────────┐
│ ←  Summary          ◀  November 2026  ▶ │
├─────────────────────────────────────────┤
│  Spent ₹38,900   Income ₹62,000         │
│  Saved ₹23,100   (37%)                  │
├─────────────────────────────────────────┤
│        [ donut chart by category ]      │
│   Food 22%  EMI 31%  Bills 12%  Other…  │
├─────────────────────────────────────────┤
│  INSIGHTS                               │
│  • Food spend is 18% higher than Oct.   │
│  • EMIs take 31% of income (≤30% guide).│
│  • 2 new subscriptions detected.        │
│  ⓘ Generated from your data on device.  │
├─────────────────────────────────────────┤
│  [ Export PDF ]   [ Export Excel ]      │
└─────────────────────────────────────────┘
```

### 9.9 Privacy & SMS log

```
┌─────────────────────────────────────────┐
│ ←  Privacy                              │
├─────────────────────────────────────────┤
│  SMS automation            [  ON  ]     │
│  Raw SMS retention         30 days ▾    │
│  App lock                  Biometric ✓  │
│  Analytics                 Off          │
│  Cloud backup              Off          │
├─────────────────────────────────────────┤
│  SMS log (last 7 days)                  │
│  12 Nov  HDFCBK  Parsed → Shopping      │
│  12 Nov  VM-OTP  Ignored (OTP)          │
│  11 Nov  BOB     Failed (no template)   │
├─────────────────────────────────────────┤
│  [ Export my data ]   [ Delete all ⚠ ]  │
└─────────────────────────────────────────┘
```

### 9.10 Home-screen widget (Android, 4×2)

```
┌──────────────────────────┐
│ Safe today    ₹ 1,240    │
│ Next EMI  ₹8,450 · 16 Nov│
│ [ + Add ]   [ Summary ]  │
└──────────────────────────┘
```

---

## 10. Folder Structure

```
money-tracker/
├── app/                                  # Expo Router (screens only, thin)
│   ├── _layout.tsx                       # root providers, lock gate
│   ├── lock.tsx
│   ├── onboarding/
│   │   ├── index.tsx
│   │   └── setup.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx                     # Home dashboard
│   │   ├── transactions.tsx
│   │   ├── loans.tsx
│   │   ├── summary.tsx
│   │   └── more.tsx
│   ├── transaction/
│   │   ├── new.tsx
│   │   └── [id].tsx
│   ├── voice.tsx
│   ├── scan.tsx
│   ├── sms-inbox.tsx
│   ├── subscriptions.tsx
│   ├── anomalies.tsx
│   ├── bills.tsx
│   ├── cards/
│   │   ├── index.tsx
│   │   └── [id].tsx
│   ├── loan/
│   │   ├── new.tsx
│   │   ├── compare.tsx
│   │   ├── payoff.tsx
│   │   ├── health.tsx
│   │   └── [id]/
│   │       ├── index.tsx
│   │       └── prepay.tsx
│   ├── networth.tsx
│   ├── tax.tsx
│   └── settings/
│       ├── privacy.tsx
│       ├── sms-log.tsx
│       ├── lock.tsx
│       ├── backup.tsx
│       ├── notifications.tsx
│       └── categories.tsx
│
├── src/
│   ├── domain/                           # PURE TS — no RN/Expo/DB imports
│   │   ├── money/
│   │   │   ├── paise.ts                  # toPaise, fromPaise, arithmetic guards
│   │   │   ├── format.ts                 # ₹ 1,23,456 (Indian grouping)
│   │   │   └── money.test.ts
│   │   ├── loan/
│   │   │   ├── emi.ts
│   │   │   ├── schedule.ts
│   │   │   ├── prepayment.ts
│   │   │   ├── comparison.ts             # APR solver
│   │   │   ├── payoff.ts                 # snowball / avalanche
│   │   │   ├── healthScore.ts
│   │   │   └── *.test.ts
│   │   ├── sms/
│   │   │   ├── parser.ts                 # orchestrates templates
│   │   │   ├── templates/
│   │   │   │   ├── index.ts              # registry by DLT sender
│   │   │   │   ├── hdfc.ts
│   │   │   │   ├── sbi.ts
│   │   │   │   ├── icici.ts
│   │   │   │   └── upi-generic.ts
│   │   │   ├── filters.ts                # OTP / promo rejection
│   │   │   └── fixtures/                 # anonymised sample SMS for tests
│   │   ├── categorize/
│   │   │   ├── rules.ts
│   │   │   └── learner.ts
│   │   ├── automation/
│   │   │   ├── subscriptionDetector.ts
│   │   │   ├── anomaly.ts
│   │   │   └── cardCycle.ts
│   │   ├── budget/
│   │   │   └── safeToSpend.ts
│   │   ├── voice/
│   │   │   ├── nlu.ts
│   │   │   └── numberWordsTa.ts          # phase 4.2
│   │   ├── ocr/
│   │   │   └── receiptParser.ts
│   │   ├── summary/
│   │   │   ├── aggregates.ts
│   │   │   └── insights.ts               # rule-based templates (en, ta)
│   │   ├── tax/
│   │   │   └── sections.ts
│   │   └── types.ts
│   │
│   ├── data/
│   │   ├── db/
│   │   │   ├── client.ts                 # expo-sqlite + drizzle
│   │   │   ├── schema.ts                 # drizzle table definitions
│   │   │   ├── migrations/               # versioned SQL
│   │   │   └── triggers.sql
│   │   ├── repositories/
│   │   │   ├── accountRepo.ts
│   │   │   ├── transactionRepo.ts
│   │   │   ├── categoryRepo.ts
│   │   │   ├── loanRepo.ts
│   │   │   ├── cardRepo.ts
│   │   │   ├── subscriptionRepo.ts
│   │   │   ├── smsRepo.ts
│   │   │   ├── reminderRepo.ts
│   │   │   └── settingsRepo.ts
│   │   └── seed/
│   │       └── defaultCategories.ts
│   │
│   ├── services/                         # all side effects live here
│   │   ├── notifications/
│   │   │   ├── reminderScheduler.ts
│   │   │   └── channels.ts
│   │   ├── smsIngest.ts
│   │   ├── ocr.ts
│   │   ├── speech.ts
│   │   ├── widgetSync.ts
│   │   ├── lock.ts                       # biometric + PIN
│   │   ├── backup/
│   │   │   ├── crypto.ts                 # AES-256-GCM, Argon2id
│   │   │   ├── exporter.ts
│   │   │   ├── importer.ts
│   │   │   └── googleDrive.ts
│   │   ├── export/
│   │   │   ├── pdfReport.ts
│   │   │   └── excelReport.ts
│   │   └── sentry.ts
│   │
│   ├── native/                           # TS facades over native modules
│   │   ├── smsReceiver.ts
│   │   ├── mlkitOcr.ts
│   │   └── moneyWidget.ts
│   │
│   ├── state/                            # Zustand stores (UI state only)
│   │   ├── sessionStore.ts
│   │   ├── lockStore.ts
│   │   ├── filterStore.ts
│   │   └── uiStore.ts
│   │
│   ├── hooks/                            # use-cases exposed to screens
│   │   ├── useSafeToSpend.ts
│   │   ├── useLoans.ts
│   │   ├── useEmiSchedule.ts
│   │   ├── useTransactions.ts
│   │   ├── useSummary.ts
│   │   └── useSmsInbox.ts
│   │
│   ├── components/
│   │   ├── ui/                           # Button, Card, Input, Sheet, Chip…
│   │   ├── charts/                       # DonutChart, BarTrend, Progress
│   │   ├── money/                        # AmountText, CategoryBadge
│   │   ├── loan/                         # LoanCard, ScheduleRow, HealthGauge
│   │   └── feedback/                     # EmptyState, ErrorBoundary, Toast
│   │
│   ├── theme/
│   │   ├── tokens.ts
│   │   ├── colors.ts                     # AA contrast verified, light + dark
│   │   └── typography.ts
│   ├── i18n/
│   │   ├── index.ts
│   │   ├── en.json
│   │   └── ta.json
│   ├── utils/
│   │   ├── date.ts
│   │   └── id.ts
│   └── types/
│       └── global.d.ts
│
├── modules/                              # Expo local native modules
│   ├── sms-receiver/
│   │   ├── android/src/main/java/.../SmsReceiverModule.kt
│   │   ├── android/src/main/java/.../SmsBroadcastReceiver.kt
│   │   └── index.ts
│   ├── ocr/
│   │   └── android/...
│   └── money-widget/
│       ├── android/src/main/java/.../MoneyWidgetProvider.kt
│       ├── android/src/main/res/layout/widget_money.xml
│       └── index.ts
│
├── plugins/                              # Expo config plugins
│   ├── withSmsPermissions.ts
│   ├── withWidget.ts
│   └── withFlagSecure.ts
│
├── __tests__/
│   ├── integration/                      # repo + DB against in-memory sqlite
│   └── e2e/                              # Maestro flows
│       ├── add-expense.yaml
│       ├── emi-mark-paid.yaml
│       └── sms-confirm.yaml
│
├── docs/
│   ├── ARCHITECTURE.md                   # this file
│   ├── adr/                              # Architecture Decision Records
│   └── privacy-policy.md
│
├── scripts/
│   ├── seed-demo-data.ts
│   └── gen-sms-fixtures.ts
│
├── app.config.ts
├── eas.json
├── drizzle.config.ts
├── tsconfig.json
├── .eslintrc.js
├── .github/workflows/ci.yml
└── package.json
```

**Structure rules**
- `domain/` is the most important folder. Money logic lives here and nowhere else.
- Feature folders are not used for screens; they are grouped by route so Expo Router maps 1:1.
- Templates for banks are data-like modules; adding a bank means adding one file and fixture tests.

---

## 11. Non-Functional Requirements

| Category | Target |
|---|---|
| Cold start | < 2.5 s on a mid-range Android (4 GB RAM) |
| Dashboard render | < 300 ms with 10,000 transactions |
| Query latency | p95 < 100 ms for summary aggregates on 5 years of data |
| Money correctness | 100% of domain math covered by unit tests; property tests for EMI schedule (balance ends at 0) |
| SMS parse accuracy | ≥ 95% on the anonymised fixture set per supported bank; unknown format → `failed`, never guessed |
| Offline | All features except backup work fully offline |
| Crash-free sessions | ≥ 99.5% |
| Accessibility | Dynamic type support, WCAG AA contrast, TalkBack labels on all money values |
| Localisation | English and Tamil; Indian grouping (₹ 12,34,567); dates dd MMM yyyy |
| Battery | No polling; SMS is event-driven; background work batched |
| App size | < 40 MB install (ML Kit model downloaded on first use) |
| Backup | Restore verified with checksum; round-trip test in CI |

---

## 12. Testing Strategy

| Level | Tooling | What is tested |
|---|---|---|
| Unit (domain) | Jest | EMI, schedules, prepayment, APR solver, payoff, health score, parsers, safe-to-spend |
| Property-based | fast-check | Schedule ends at zero; total principal paid equals loan principal; no negative balances |
| Parser fixtures | Jest + anonymised SMS corpus | Every bank template, OTP/promo rejection, duplicates |
| Integration | Jest + in-memory sqlite | Repositories, migrations up/down, triggers, foreign keys |
| Component | RNTL | Critical forms (add transaction, loan form), validation messages |
| E2E | Maestro on emulator | Add expense, mark EMI paid, confirm SMS, backup/restore round-trip |
| Native | Robolectric + device farm | SMS receiver behaviour when app killed, widget updates |
| Security | Manual checklist + static scan | No PII in logs, FLAG_SECURE applied, keys not in AsyncStorage |
| Performance | Flashlight / Perfetto | Cold start, list scroll jank on low-end device |
| Usability | 5–8 user sessions in Tamil and English | Task success on safe-to-spend and EMI tasks |

**Definition of done for a domain change**: unit tests, property test where applicable, updated fixtures, and a snapshot of one worked example in the docs.

---

## 13. DevOps & Release

- **Branching**: trunk-based with short-lived feature branches; PR required; 1 reviewer minimum.
- **CI (GitHub Actions)**: lint → typecheck → unit tests → integration tests → EAS build (preview) on merge.
- **Environments**: `dev` (dev-client), `preview` (internal APK for testers), `production` (Play Store internal → closed → open testing).
- **Migrations**: forward-only; each migration has a test that runs against a copy of the previous schema with sample data.
- **Feature flags**: local JSON flags (no remote dependency); used for SMS automation, voice, widget.
- **Release checklist**: privacy policy link live, permission declarations filled, data-safety form accurate, crash-free rate green in beta, backup restore tested on two devices.

---

## 14. Phased Delivery Plan

| Phase | Duration (indicative) | Deliverables | Exit criteria |
|---|---|---|---|
| **P0 Foundation** | 2 weeks | Repo, CI, design tokens, DB + migrations, app lock, i18n skeleton | Lock works; migrations tested |
| **P1 Core ledger + SMS** | 3 weeks | Accounts, transactions, categories, rules, SMS receiver + parser (2 banks + UPI), SMS inbox, SMS log | 95% parse accuracy on fixtures; no duplicate entries |
| **P2 Loan & EMI intelligence** | 3 weeks | Loan register, schedule, reminders, prepayment, comparison, payoff, health score | Schedule property tests green; reminders survive reboot |
| **P3 Automation & summary** | 2–3 weeks | Subscriptions, anomalies, cards, bill calendar, safe-to-spend, summary + insights, budgets, goals | Safe-to-spend validated on 3 sample profiles |
| **P4 Input & widget** | 2 weeks | Voice entry (en-IN, ta-IN), OCR receipt, Android widget | Voice success ≥ 85% on test set; widget refresh < 15 min |
| **P5 Trust hardening & extras** | 2–3 weeks | Encrypted backup + Drive, delete-all, net worth, tax helper, PDF/Excel export, privacy audit | Restore round-trip on 2 devices; privacy review signed off |
| **Beta & launch** | 2 weeks | Closed beta (30–50 users), bug bash, store listing | Crash-free ≥ 99.5% in beta |

**Indicative total: ~17–19 weeks** with a team of 2 React Native engineers, 1 Android native engineer (part-time), 1 QA, 1 product designer, and 1 product owner.

---

## 15. Architecture Decision Records (summary)

| ID | Decision | Alternatives considered | Rationale |
|---|---|---|---|
| ADR-001 | Offline-first, no mandatory backend | Firebase / custom API | Privacy positioning, zero data-liability, zero server cost |
| ADR-002 | Money stored as integer paise; rates as basis points | Floats, decimal strings | Eliminates rounding drift in EMI schedules |
| ADR-003 | expo-sqlite + Drizzle ORM | Realm, WatermelonDB, AsyncStorage | Relational aggregates, migrations, typed queries |
| ADR-004 | SQLite file unencrypted at DB level in MVP; app sandbox + lock; SQLCipher evaluated for v1.1 | SQLCipher from day one | Build complexity and performance trade-off; revisit after profiling |
| ADR-005 | SMS-parsed transactions require confirmation | Auto-post | Protects ledger integrity when bank templates change |
| ADR-006 | Rule-based insights, no LLM in MVP | On-device LLM, cloud LLM | Deterministic, explainable, offline, no data egress |
| ADR-007 | Encrypted backup client-side, Drive appDataFolder | Our own server storage | User owns keys and storage; no liability for our servers |
| ADR-008 | Native Kotlin module for SMS and widget | Third-party-only libs | Reliability when app is killed; control over permissions |
| ADR-009 | Zustand for UI state; DB is source of truth | Redux, Context-only | Simple; avoids stale copies of financial data |

---

## 16. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Google Play restricts SMS permissions for finance apps | High | High | Prepare Play declaration early; keep SMS as a clearly optional feature; fallback: sideloaded APK / enterprise distribution for personal use; evaluate AA framework for v2 |
| R2 | No SMS access on iOS | Certain | Medium | Position iOS as manual/voice/OCR; set expectations in store listing |
| R3 | Bank SMS format changes break parser | High | Medium | Template registry per sender; `failed` state surfaced in SMS log; confirmation step; fixtures updated via monthly review |
| R4 | Calculated EMI differs from bank's actual schedule | Medium | High | Allow override with actual EMI; disclaimer; import bank statement later |
| R5 | OCR accuracy on crumpled receipts | High | Low | Confidence thresholds; always editable; no auto-save |
| R6 | Users distrust a finance app with SMS access | Medium | High | Transparent SMS log, opt-in, retention controls, local-only processing |
| R7 | Backup passphrase forgotten → data unrecoverable | Medium | High | Clear warning; recovery code generated at backup time; no silent recovery |
| R8 | Notifications killed by OEM battery optimisation (MIUI, etc.) | High | Medium | Onboarding guide per OEM; in-app check and deep link to battery settings |
| R9 | Scope creep across 7 modules | High | High | Phase gates; MVP limited to P0–P2; Pro features behind feature flags |
| R10 | Regulatory (DPDP Act obligations) | Medium | High | Privacy policy, consent flows, erase and export features in P5 |

---

## 17. Open Questions for Product Owner

1. Confirm target Android versions (suggest Android 9+ / API 28+).
2. Is an optional Google Drive backup acceptable, or local file backup only for v1?
3. Preferred default salary-date logic for safe-to-spend (fixed day vs last credit detection)?
4. Launch markets: India only for v1, or other currencies in v2?
5. Business model: free with optional Pro (one-time or subscription)? This affects feature gating.
6. Should the Tamil UI be full translation at launch, or English UI with Tamil insights only?

---

## 18. Glossary

| Term | Meaning |
|---|---|
| EMI | Equated Monthly Instalment |
| Amortisation | Schedule splitting each EMI into interest and principal |
| APR (effective) | Annualised cost including processing fee |
| Snowball / Avalanche | Debt payoff orders by balance / by interest rate |
| Safe-to-spend | Money free after committed outflows and savings reserve |
| DLT header | Telecom-registered sender ID for bank SMS in India |
| VPA | Virtual Payment Address (UPI ID, e.g. name@bank) |
| Paise | 1/100 of a rupee; smallest money unit stored |
| DPDP Act | Digital Personal Data Protection Act, 2023 (India) |
