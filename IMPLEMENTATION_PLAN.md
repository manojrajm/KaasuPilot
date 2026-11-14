# KasuPilot — Implementation Plan & Handoff

> **For the next coding agent (Codex / Claude).** This file is the single source of truth for the
> work in progress. Read it fully before editing code. Last updated: **14 Nov 2026**.
> Read `AGENTS.md` too: Expo SDK **58**; always use `npx expo install <pkg>`; check installed
> package types in `node_modules/<pkg>/build/*.d.ts` instead of trusting memory.

---

## 0. TL;DR — state right now

- **Working tree is mid-refactor and does NOT typecheck.** 14 known `tsc` errors are listed in §4.
  These are expected: old consumers still call APIs that were replaced. Fix them in the order in §5.
- **Committed** (by user/teammate): SQLite ledger (`d95ca07`), Profile page UI (`87d9094`).
- **Uncommitted (this session):** new data layer (cards, loans in SQLite, salary cycle, persistent
  settings), app lock (biometric + PIN + animation), realistic bank card component, cards list screen.
- **Still to build:** card add/edit + detail screens, loan add/edit form, profile photo, wiring
  Profile/Home/Loans/Transactions to the new data layer, salary-based Home hero.

---

## 1. Product decisions (confirmed by the user — do not re-ask)

| # | Decision |
|---|---|
| D1 | Personal-use APK only, **not Play Store**. Storing full card number, expiry **and CVV** is wanted. Secrets go in the hardware keystore (`expo-secure-store`) and are revealed only after biometric/PIN. Never in SQLite, logs, or exports. |
| D2 | Cards: user creates **only their own** cards. Banks: **SBI, Indian Bank, HDFC, ICICI, Axis, Other**. Only choose **bank + Debit/Credit** (no product variants). Show network logo **VISA / Mastercard / RuPay** (Amex/Diners also detected). Bank colours/logos approximate the real cards. |
| D3 | App lock: biometric (fingerprint/face) with 4-digit PIN fallback, "classic" animation (pulsing rings, scan line, green tick, vault doors opening; red flash + shake + haptic on failure). |
| D4 | Home: **remove "safe to spend per day"**. Show **Available balance = salary (auto-credited every month on salary day) + extra income this cycle − expenses this cycle**, displayed **on the salary card** visual. |
| D5 | On each new salary date, if the previous cycle has money left, **ask**: "Add to this month" (carry forward) **or** "Move to savings". |
| D6 | Remove **all demo data** (seed accounts HDFC/ICICI/Regalia, demo loans, fake profile/cards). Keep one built-in **Cash** account (`acc_cash`). |
| D7 | Loans: no demo loans; an **Add loan form that asks every needed field** (see §5 step 6). |

---

## 2. Architecture (keep these rules)

```
src/app/*            screens (Expo Router, thin)
src/hooks/*          use-cases for screens (subscribe to repos, compute view models)
src/data/repositories/*  the only code that touches SQLite
src/data/db/client.ts    single connection + migrations (PRAGMA user_version)
src/domain/*         pure TS, no React/Expo imports (except utils/date)
src/services/*       side effects: keystore, biometrics
src/components/*     UI
```
- Money = integer **paise**. Rates = **basis points**. Dates in ledger = ISO instants; month/cycle
  boundaries computed in **local time** (`src/utils/date.ts`) then converted to ISO.
- Repos expose `subscribe(cb)`; hooks reload on change. Hooks follow this lint-safe pattern
  (no sync setState in effect):
  ```ts
  useEffect(() => { let active = true;
    const load = () => fetchX().then(d => { if (active) setData(d); }).catch(console.error);
    load(); const unsub = repo.subscribe(load);
    return () => { active = false; unsub(); }; }, []);
  ```

---

## 3. What is DONE

### 3.1 Committed earlier
- `src/data/db/client.ts` v1 schema: `accounts`, `transactions`, `settings`.
- `transactionRepo` on SQLite; `useHomeDashboard`/`useTransactions` live; `metro.config.js`
  (wasm + COOP/COEP headers for web); `src/utils/date.ts`, `src/utils/id.ts`.
- Teammate's Profile UI: `src/app/profile.tsx`, `src/components/profile/*`, `useProfile.ts`.

### 3.2 This session (uncommitted) — files and what they do
| File | Status | Notes |
|---|---|---|
| `package.json` / `app.json` | ✅ | Installed: expo-local-authentication, -secure-store, -crypto, -haptics, -screen-capture, -image-picker, -file-system, -clipboard, -linear-gradient (all `~58.x`). `expo-secure-store` plugin added. |
| `src/data/db/client.ts` | ✅ | **Migration v2**: accounts += `card_kind, bank_code, network, holder_name, credit_limit_paise`; transactions += `source_ref` (unique partial index); new `loans` table; deletes demo accounts (archives if used); ensures `Cash` account. Exports `CASH_ACCOUNT_ID`. |
| `src/domain/types.ts` | ✅ | `CardKind`, `CardNetwork`, `BankCode`; `Account` card fields; `Loan.processingFeePaise`, `emiIsCustom`. |
| `src/domain/profile/types.ts` | ✅ | `UserProfile` += `salaryAccountId`, `photoUri`; `SalaryState`; `DEFAULT_*` constants. **`ConnectedCard` removed** (on purpose). |
| `src/domain/cards/cardNumber.ts` | ✅ | `isValidLuhn`, `detectNetwork`, `formatCardNumber`, `maskCardNumber`, `validateExpiry`, `formatExpiryInput`, `expectedLength`, `digitsOnly`. |
| `src/domain/cards/bankThemes.ts` | ✅ | `BANKS`, `BANK_ORDER`, `themeFor(bank, kind)` (gradients/text/accent per bank & kind). |
| `src/domain/loans/schedule.ts` | ✅ | `instalmentDueDate`, `nextDueDate`, `instalmentNumberInMonth`, `startDateFromFirstEmi`, `instalmentsDueSoFar`, `monthlyInterest`, `outstandingAfter`, `emiTooLowToRepay`. Convention: `loan.startDate` = 1st of month **before** first EMI; instalment k due k months later on `dueDayOfMonth` (clamped). |
| `src/domain/loans/dueEvents.ts` | ✅ | `buildDueEvents(loans, year, monthIndex)` (pure, replaces old repo calendar), `instalmentFromEventId`. |
| `src/domain/loans/amortisation.ts` | ✅ | Due dates via `instalmentDueDate` (month-end bug fixed); `overdue` status. |
| `src/domain/budget/salaryCycle.ts` | ✅ | `cycleContaining`, `nextCycle`, `cycleFromKey`, `cyclesSince`, `calculateCycleBalance`. |
| `src/data/repositories/settingsRepo.ts` | ✅ | Typed keys: `profile`, `security`, `experience`, `salaryState`; `get/set/update/reset`. **Key `salaryDay` removed.** |
| `src/data/repositories/accountRepo.ts` | ✅ | Card fields, `getById`, `getNameMap` (incl. archived), `notifyChanged`, `getLiquidBalancePaise`. |
| `src/data/repositories/transactionRepo.ts` | ✅ | `create(data, { sourceRef?, notify? })` → `Transaction \| null` (INSERT OR IGNORE on `source_ref`); `getTotalsInRange`; `notifyChanged`. |
| `src/data/repositories/cardRepo.ts` | ✅ | `list, getById, create(CardInput), update, getStartingAmount, readSecrets, remove` (archives if used). Debit opening = balance; credit opening = −outstanding. |
| `src/services/cardVault.ts` | ✅ | SecureStore `card_secret_<id>` = `{number, expiry, cvv}` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`). |
| `src/data/repositories/loanRepo.ts` | ✅ rewritten | SQLite. `getAll, getById, create(LoanInput), update, remove, payNextEmi(id) → PayResult, recordPrepayment`. `payNextEmi` updates loan + inserts EMI debit (`source_ref emi:<id>:<k>`) in one DB transaction. **Removed:** `markInstallmentPaid`, `getCalendarEvents`, `markCalendarEventPaid`. |
| `src/data/repositories/salaryRepo.ts` | ✅ | `sync()` auto-credits salary per cycle (`source_ref salary:<YYYY-MM-DD>`), catches up missed cycles, sets `pendingRollover`; `resolveRollover('carry'\|'savings')`; `onSalaryConfigChanged(before, after)`; `getCurrentCycle(day)` → `{cycle, totals, balance, state}`; `getSavingsPaise`. |
| `src/data/repositories/profileRepo.ts` | ✅ rewritten | Persists via settingsRepo; same method names as teammate's version; `updateProfile` calls `salaryRepo.onSalaryConfigChanged`; `getCards()` now returns `Account[]`; exports exclude secrets; `factoryResetVault` resets security+experience only. |
| `src/services/lock.ts` | ✅ | PIN (salted SHA-256 ×300 in SecureStore), 5 tries → 30 s lockout, `biometricKind`, `authenticateBiometric`, `withoutAutoLock(task)` (use around image picker/camera so returning doesn't re-lock). |
| `src/components/security/BiometricGlyph.tsx` | ✅ | Rings, scan line, fingerprint/face glyph; colour cyan→green / red flash. |
| `src/components/security/PinPad.tsx` | ✅ | Dots with shake + keypad + biometric key. |
| `src/components/security/LockScreen.tsx` | ✅ | Modes `unlock \| confirm \| setup`; success = tick + vault doors; failure = shake/red/haptic. |
| `src/components/security/LockProvider.tsx` | ⚠️ 1 TS error | Context `useAppLock()` → `confirmIdentity(reason)`, `setupPin()`, `lockNow()`. Locks on launch, auto-lock by `security.autoLockDuration`, privacy shield via `expo-screen-capture`. Prop `deferPrompt`. |
| `src/app/_layout.tsx` | ✅ | Wraps `AppTabs` in `LockProvider`; lock waits for video splash. |
| `src/components/cards/CardLogos.tsx` | ✅ | `NetworkLogo` (visa/mastercard/rupay/amex/diners), `BankLogo` (drawn SBI/HDFC/ICICI/Axis/Indian Bank marks + wordmark). |
| `src/components/cards/BankCard.tsx` | ✅ | Realistic card: gradient, sheen, chip, contactless, mono embossed number, VALID THRU, holder, network logo; `flipped` → back with stripe + CVV; `centerLabel/centerValue` for Home balance. |
| `src/components/cards/cardProps.ts` | ✅ | `cardPropsFromAccount(account)`. |
| `src/hooks/useAccounts.ts` | ✅ | `{ accounts, byId }` live. |
| `src/hooks/useSecureScreen.ts` | ✅ | Blocks screenshots while mounted. |
| `src/app/cards/index.tsx` | ⚠️ | Card list + empty state; links to `/cards/new` and `/cards/[id]` which **don't exist yet**. |
| `src/components/forms/FormFields.tsx` | ❌ not created | Was being written when the session stopped (see §5 step 2). |

---

## 4. Current `npx tsc --noEmit` errors (expected; fix via §5)

```
src/app/cards/index.tsx              '/cards/new', `/cards/${id}` not in typed routes  → create the routes (step 3), then run `npx expo start` once to regenerate .expo/types
src/app/profile.tsx:24               ConnectedCard no longer exists                    → step 7
src/components/profile/RealTime3DCard.tsx:10  ConnectedCard                             → delete file (step 7)
src/components/security/LockProvider.tsx:216  StyleSheet.absoluteFillObject missing in RN 0.88 → use `...StyleSheet.absoluteFill` or explicit position:'absolute',top/left/right/bottom:0
src/hooks/useHomeDashboard.ts:116,118  settingsRepo 'salaryDay' key removed            → step 8 (rewrite)
src/hooks/useHomeDashboard.ts:288      loanRepo.markInstallmentPaid removed            → use loanRepo.payNextEmi
src/hooks/useLoans.ts:36,59,70         getCalendarEvents / markInstallmentPaid / markCalendarEventPaid removed → step 6
src/hooks/useProfile.ts:6,11           ConnectedCard + old UserProfile shape           → step 7
```
Files not yet migrated but compiling: `AddTransactionModal.tsx`, `TransactionCard.tsx`,
`TransactionDetailModal.tsx` still use `DEFAULT_ACCOUNTS` (demo accounts) → step 9.

---

## 5. Remaining work — do in this order

### Step 1 — Fix LockProvider TS error
`styles.cover`: replace `...StyleSheet.absoluteFillObject` with
`position: 'absolute', top: 0, left: 0, right: 0, bottom: 0`.

### Step 2 — `src/components/forms/FormFields.tsx`
Shared dark-theme form primitives: `Field` (label, TextInput, optional `prefix` like "₹",
`error`/`hint`), `ChipGroup<T>` (single select chips, optional colour dot), `PrimaryButton`
(tones `primary | danger | ghost`). Colours: bg `#07090E`, panel `#0D111A`, accent `#00F0FF`,
muted `#8A96AD`, error `#FF6B61`.

### Step 3 — Card screens
**`src/app/cards/new.tsx`** (create; edit when `?id=` param):
- Live `<BankCard>` preview at top (shows typed full number).
- Fields: Bank chips (`BANK_ORDER`, colour = `BANKS[x].brand`), custom bank name if `other`;
  Debit/Credit toggle; Card number (format with `formatCardNumber`, max `expectedLength(network)`,
  show "✓ valid" / "check number" via `isValidLuhn`); network auto via `detectNetwork` with manual
  override chips; Name on card (uppercase); Expiry (`formatExpiryInput`, validate `validateExpiry`);
  CVV (3 digits, 4 for amex, `secureTextEntry`); Debit: "Current balance" / Credit: "Current
  outstanding" + "Credit limit".
- Save → `cardRepo.create` / `cardRepo.update`; then `router.back()`.
- Edit mode: first `await confirmIdentity('Edit card details')`; if false → `router.back()`;
  then load `cardRepo.readSecrets(id)` + `cardRepo.getStartingAmount(id)`.
- Call `useSecureScreen('card-form')`.

**`src/app/cards/[id].tsx`** (detail):
- Large `<BankCard>` masked. Button "Show details" → `confirmIdentity('Show card details')` →
  `readSecrets` → show full number/expiry; auto-hide after **30 s** (countdown text).
- Tap card → flip to back (CVV visible only while revealed).
- "Copy number" (`expo-clipboard`), then after 30 s clear clipboard **only if** it still equals the number.
- Show balance (debit) or outstanding + available limit (credit), and this-cycle/this-month spend on
  this card (`transactionRepo.getAll({ accountId, startDate, endDate })`).
- Edit → `/cards/new?id=…`; Delete → `Alert` confirm → `cardRepo.remove`.
- `useSecureScreen('card-detail')`.

### Step 4 — Profile photo (`src/services/profilePhoto.ts` + PilotIdentityCard)
- `pickFromGallery()` / `takePhoto()` using `expo-image-picker`
  (`launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1,1], quality: 0.8 })`,
  request permissions first), **wrapped in `lockService.withoutAutoLock`**.
- Copy result into `new Directory(Paths.document, 'profile')` (create if `!exists`) as
  `avatar-<timestamp>.jpg` via `await new File(uri).copy(destFile)`; delete the previous avatar
  file; save `photoUri` with `profileRepo.updateProfile({ photoUri })`. `removePhoto()` deletes file + sets null.
- `PilotIdentityCard`: show `expo-image` `<Image source={{ uri: profile.photoUri }}>` in the avatar
  circle (fallback: initials of `profile.name`, or ⚡); add prop `onPressAvatar` → `Alert` with
  Gallery / Camera / Remove photo / Cancel.
- Show the same avatar in `HomeTopBar` (optional).

### Step 5 — (done in data layer) nothing to do

### Step 6 — Loans: form + consumers
**`src/hooks/useLoans.ts`**: load `loanRepo.getAll()`; `calendarEvents = buildDueEvents(loans, y, m)`;
health = `calculateLoanHealthScore(loans, profile.monthlyIncomePaise, await accountRepo.getLiquidBalancePaise())`;
`markPaid(id) = loanRepo.payNextEmi(id)` (return the `PayResult`); `recordPrepayment` unchanged;
remove `markCalendarEventPaid`.

**`src/app/loans.tsx`**:
- `handleCalendarMarkPaid(eventId, loanId)`: `k = instalmentFromEventId(eventId)`; allow only if
  `k === loan.monthsPaid + 1`, else HUD "Pay earlier instalments first" / "Already paid".
- Show `PayResult.reason` on failure.
- Add "＋ Add loan" button → `/loan-form`; empty state when no loans; LoanCard long-press or an
  "Edit" action → `/loan-form?id=…`.
- Replace hard-coded text "Prioritizes highest interest rate (9.1% Nexon first)" with the actual
  first loan of `payoffComparison.avalanche.monthlyOrder`.

**`src/app/loan-form.tsx`** — fields (all required unless marked):
1. Loan name (e.g. "Car loan")
2. Loan type chips: home / auto / personal / gold / education
3. Lender: chips SBI / Indian Bank / HDFC / ICICI / Axis / Other (+ text)
4. Loan amount (principal, ₹)
5. Interest rate (% p.a., → bps = round(% × 100))
6. Tenure (months; hint shows years)
7. First EMI date (DD / MM / YYYY inputs; day becomes due day)
8. EMI amount — auto = `calculateEmi(principal, bps, tenure)`; toggle "Use my bank's exact EMI" → editable (`emiIsCustom`)
9. EMIs already paid — default `instalmentsDueSoFar(...)`, editable (0…tenure)
10. Current outstanding — default `outstandingAfter(principal, bps, emi, paid)`, editable (from bank statement)
11. Processing fee (optional, default 0)
12. Pay EMI from: chips of `useAccounts().accounts` (cards + Cash)
- Validate: EMI > first-month interest (`emiTooLowToRepay` → error); paid ≤ tenure.
- Save → `loanRepo.create` / `loanRepo.update`; edit mode has "Delete loan" (`loanRepo.remove`, confirm Alert).

### Step 7 — Profile screen wiring
- **`src/hooks/useProfile.ts`**: rewrite with the lint-safe pattern; state from
  `profileRepo.getProfile/getSecuritySettings/getExperienceSettings/getCards`; initial values from
  `DEFAULT_*`; `cards: Account[]`. `toggleBiometric`: when turning **on** and `!(await lockService.hasPin())`
  → `await setupPin()` (from `useAppLock`, so do this in the screen or pass it in); keep off if cancelled.
- **`src/app/profile.tsx`**: replace the "CONNECTED 3D ACCOUNTS" block with a horizontal list of
  `<BankCard {...cardPropsFromAccount(c)} width={280} onPress={() => router.push(`/cards/${c.id}`)} />`
  + an "＋ Add card" tile → `/cards/new` + "Manage ›" → `/cards`. Remove `ConnectedCard` import.
  Delete `src/components/profile/RealTime3DCard.tsx`.
- **`EditProfileModal.tsx`**: label "MONTHLY SALARY"; add "Salary credited to" chips from accounts
  (sets `salaryAccountId`); keep name + salary day.
- **`FinancialTelemetryCard.tsx`**: fix ordinal ("1st/2nd/3rd/nth"), show salary account name.
- Rename visible "Tesla" strings when touching these files (trademark).

### Step 8 — Home: salary balance on the card (D4, D5)
Rewrite **`src/hooks/useHomeDashboard.ts`**:
- On every load: `await salaryRepo.sync()` first, then fetch `profile`, `salaryRepo.getCurrentCycle(profile.salaryDayOfMonth)`,
  `accountRepo.getById(profile.salaryAccountId)`, `transactionRepo.getRecent(5)`,
  `countPendingReview()`, `loanRepo.getAll()`. Subscribe to transactionRepo, loanRepo, settingsRepo, accountRepo.
- Return: `salaryCard` (Account | null), `cycle` (start/end), `availablePaise`, `salaryPaise`,
  `extraIncomePaise` (= cycle income − salary), `spentPaise`, `carriedInPaise`, `usedPercent`,
  `isOverspent`, `daysToNextSalary`, `pendingRollover`, `savingsPaise`, `resolveRollover(choice)`,
  `nextEmi` (via `nextDueDate`), `alerts` (EMI ≤ 3 days / overdue; overspent cycle),
  `transactions`, `recentTransactions`, `addTransaction`, `deleteTransaction`,
  `markEmiPaid = loanRepo.payNextEmi(nextEmi.loanId)`. Remove safe-to-spend/outflows.
- New **`src/components/home/SalaryBalanceHero.tsx`**: `<BankCard {...salaryCard} centerLabel="AVAILABLE BALANCE" centerValue={formatPaise(available)} centerValueColor={overspent ? '#FF6B61' : undefined}/>`;
  if no card chosen, a plain dark card with the same numbers. Below: progress bar (`usedPercent`),
  row "Salary ₹X · Extra ₹Y · Spent ₹Z (· Carried ₹C)", "Next salary: 1 Dec (18 days)", savings pill if > 0.
  If `monthlyIncomePaise === 0`: CTA "Set your monthly salary" → `/profile` (opens EditProfileModal).
- New **`SalaryRolloverCard.tsx`**: "Last month you had ₹X left" + buttons
  **[Add to this month]** → `resolveRollover('carry')`, **[Move to savings]** → `resolveRollover('savings')`.
- **`src/app/index.tsx`**: replace `SafeToSpendHero` with `SalaryBalanceHero`; show
  `SalaryRolloverCard` when `pendingRollover`; remove `CashFlowGauge`; render `LoanCockpitCard`
  only if `nextEmi`; pay EMI → show `PayResult.reason` on failure.

### Step 9 — Transactions UI uses real accounts
- `AddTransactionModal`: replace `DEFAULT_ACCOUNTS` with `useAccounts().accounts`; default selected =
  `profile.salaryAccountId ?? accounts[0]?.id ?? 'acc_cash'` (remove hard-coded `'acc_hdfc'`).
- `TransactionCard`: accept `accountName?: string` prop (pass from `transactions.tsx` using `useAccounts().byId`).
- `TransactionDetailModal`: use `useAccounts().byId[transaction.accountId]`.
- Then `DEFAULT_ACCOUNTS` stays only in `client.ts` (migration cleanup).

### Step 10 — Verify
1. `npx tsc --noEmit` → 0 errors. `npx eslint <changed files>` → no new errors
   (the old animation files already have ~40 pre-existing lint errors; don't count them).
2. `npx expo export --platform android --no-bytecode --output-dir <tmp>` bundles.
3. Device test (dev build needed for Face ID on iOS; Android fingerprint works in Expo Go):
   - Fresh install → set PIN → lock shows after splash; wrong PIN shakes; 5 wrong → 30 s lockout.
   - Background > auto-lock time → locks; opening gallery for avatar does **not** re-lock.
   - Add an SBI RuPay debit + HDFC Visa credit; Luhn error on a wrong digit; reveal needs biometric; hides after 30 s.
   - Set salary ₹X, day D, account = SBI card → Home card shows ₹X; add expense → drops; add extra income → rises.
   - Change device date past next salary day → rollover prompt; both choices behave as D5.
   - Add a loan → appears in Loans + calendar; Mark paid → EMI debit appears in ledger and Home available drops; tapping again for the same instalment is refused.
   - Restart app → everything persists.
4. Commit in logical chunks (data layer, lock, cards, loans, home) — only when the user asks.

---

## 6. Known risks / notes
- Card secrets use app-level biometric gate + keystore (not `requireAuthentication: true`, which would
  wipe keys when a fingerprint is added). Rooted phones can bypass; acceptable for personal use.
- `salaryRepo.sync()` adds the salary entry dated at the cycle start (salary day). If the user deletes
  that entry, it is not re-added for that cycle (by design).
- An overspent cycle is **not** carried as debt into the next cycle.
- Changing salary day deletes the current cycle's auto-salary entry and re-credits under the new schedule.
- `expo-sqlite` on web needs the COOP/COEP headers already configured; `withExclusiveTransactionAsync` is not used (web-incompatible).
- Typed routes: after adding new route files, run `npx expo start` once so `.expo/types/router.d.ts` regenerates.

---

## 7. Longer-term roadmap (after the above)
Tests (Jest + fast-check for `domain/`), CI, Tamil i18n, EMI reminders (`expo-notifications`),
SMS ingest (Android, dev build), budgets, monthly summary, encrypted backup, compress `assets/*.mp4`
(duplicate 11 MB `KP.mp4`), rename "Tesla*" components.
