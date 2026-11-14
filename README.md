<div align="center">

<img src="assets/images/KPLogo.png" alt="KasuPilot" width="120" />

# KasuPilot

**Offline-first personal finance cockpit for India — salary, cards, loans and bank SMS, on your phone only.**

<br />

[![Download APK](https://img.shields.io/badge/Download-Android%20APK-00E676?style=for-the-badge&logo=android&logoColor=black)](https://github.com/manojrajm/KaasuPilot/releases/latest)
[![Latest Release](https://img.shields.io/github/v/release/manojrajm/KaasuPilot?color=00F0FF&label=Latest%20Release&style=for-the-badge&logo=github)](https://github.com/manojrajm/KaasuPilot/releases)

<br />

![Expo SDK](https://img.shields.io/badge/Expo%20SDK-58-000020?logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Platform](https://img.shields.io/badge/platform-Android-3DDC84?logo=android)
![Storage](https://img.shields.io/badge/data-100%25%20on--device-0B1530)

</div>

---

## Table of contents

1. [📥 Download Android APK](#-download-android-apk)
2. [Overview](#overview)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Tech stack](#tech-stack)
6. [Project structure](#project-structure)
7. [Getting started](#getting-started)
8. [Building the Android APK](#building-the-android-apk)
9. [Data model](#data-model)
10. [Security model](#security-model)
11. [SMS ingestion pipeline](#sms-ingestion-pipeline)
12. [Conventions](#conventions)
13. [Known limitations](#known-limitations)
14. [Roadmap](#roadmap)
15. [Related documents](#related-documents)

---

## 📥 Download Android APK

Get the latest standalone release directly on your Android smartphone:

<div align="center">

[![Download KasuPilot APK](https://img.shields.io/badge/📲%20Click%20Here%20to%20Download-KasuPilot%20Latest%20APK-00E676?style=for-the-badge&logo=android&logoColor=black)](https://github.com/manojrajm/KaasuPilot/releases/latest)

*View all releases and changelogs on [GitHub Releases](https://github.com/manojrajm/KaasuPilot/releases).*

</div>

### 📲 Installation Instructions:
1. Tap the green **Download APK** button above to download the latest `.apk` to your phone.
2. In your phone's **Downloads** folder, tap the downloaded APK and select **Install**.
3. If Android displays *"App blocked to protect your device"* (Google Play Protect for sideloaded financial SMS apps):
   - Open **Google Play Store** ➔ Tap your **Profile Icon** ➔ **Play Protect** ➔ **Settings ⚙️**.
   - Temporarily toggle OFF *"Scan apps with Play Protect"*.
   - Return to Downloads and complete the installation.
4. If Android 13/14/15 shows SMS permission disabled (*"Restricted Setting"*):
   - Long press KasuPilot icon ➔ **App info (ℹ️)** ➔ Tap **3 dots (⋮)** in the top right ➔ Select **"Allow restricted settings"** ➔ Enter PIN/Fingerprint.
   - Go to **Permissions** ➔ **SMS** ➔ Select **"Allow"**.
5. Launch KasuPilot and enjoy your private, offline personal finance cockpit!

---

## Overview

KasuPilot answers three questions every day:

| Question | Where it is answered |
|---|---|
| **How much money do I have left this salary cycle?** | Home → salary card shows *available balance = carried balance + salary + extra income − expenses* |
| **What do I owe, and when is the next EMI due?** | Loans cockpit, due-dates calendar, EMI reminders |
| **Where is my money going?** | Transactions ledger, analytics and 50/30/20 envelopes |

All data lives in an on-device SQLite database. There is no backend and no account; nothing leaves the
phone unless the user exports a backup file.

> **Status:** personal-use build, distributed as a sideloaded APK (not on Google Play).

---

## Features

### 🏠 Home dashboard
- **Salary balance card** — the user's real salary card rendered with the bank's colours, showing the
  available balance for the current salary cycle, a used-percentage bar and days to next salary.
- **Automatic salary credit** — the configured salary is posted to the ledger on salary day every month
  (idempotent: never posted twice).
- **Cycle rollover prompt** — when a cycle ends with money left: *add to this month* or *move to savings*.
- Spending velocity gauge, next-EMI cockpit (pay and record in one tap), alerts, recent activity.

### 💳 Cards
- Add only your own cards: **SBI, Indian Bank, HDFC, ICICI, Axis** or any other bank; debit or credit.
- Realistic card faces: bank colour gradient, bank mark, EMV chip, contactless symbol, embossed-style
  number, **VISA / Mastercard / RuPay** logo; tap to flip to the CVV side.
- Card number validated with the **Luhn** checksum; network detected from the number (IIN ranges).
- Full number, expiry and CVV are stored in the **hardware keystore** and revealed only after biometric/PIN,
  auto-hidden after 30 s; copied numbers are cleared from the clipboard after 30 s.

### 🏦 Loans & EMI
- Add/edit loans with every field: principal, rate, tenure, first EMI date, bank's exact EMI, EMIs already
  paid, current outstanding, processing fee, paying account.
- Amortisation schedule, prepayment simulator (reduce tenure vs reduce EMI), Snowball vs Avalanche payoff,
  loan health score (0–100), month-by-month due-dates calendar.
- **Pay EMI** splits interest/principal, advances the schedule and writes the ledger debit in a single DB
  transaction; the same instalment can never be paid twice.
- Local EMI reminders via `expo-notifications`.

### 📬 Bank SMS intelligence (Android)
- Native `BroadcastReceiver` + Headless JS task read bank SMS even when the app is closed.
- On-device regex parser for SBI, Indian Bank, HDFC, ICICI, Axis and UPI messages: debit/credit, amount,
  merchant, account last-4.
- Duplicate protection (reference number + hash); unmatched bank/account is flagged instead of guessed.
- Review sheet: confirm, edit merchant/category/account, or ignore.

### 👤 Profile & security
- Profile photo from gallery or camera (copied into app-private storage).
- App lock: fingerprint/face with 4-digit PIN fallback, animated lock screen (pulse rings, scan line,
  vault doors on success; shake + haptic on failure), auto-lock (immediate / 1 min / 5 min).
- Screenshot and recent-apps protection.

### 📊 Analytics & export
- Category spend breakdown and 50/30/20 envelope budgeting.
- CSV export of the ledger; PIN-protected backup file (`.kasuvault`) export/import.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  PRESENTATION   src/app (Expo Router screens) · src/components (UI)   │
├──────────────────────────────────────────────────────────────────────┤
│  APPLICATION    src/hooks — use-cases; subscribe to repos, build      │
│                 view models (useHomeDashboard, useLoans, …)           │
├──────────────────────────────────────────────────────────────────────┤
│  DOMAIN         src/domain — pure TypeScript, no React/Expo/DB        │
│                 money · loans · budget · cards · sms · profile        │
├──────────────────────────────────────────────────────────────────────┤
│  DATA           src/data/repositories → src/data/db/client (SQLite)   │
│                 versioned migrations via PRAGMA user_version           │
├──────────────────────────────────────────────────────────────────────┤
│  SERVICES       src/services — keystore, biometrics, notifications,   │
│                 SMS ingestion, backup, profile photo                  │
├──────────────────────────────────────────────────────────────────────┤
│  NATIVE         plugins/ — Expo config plugin + Kotlin SMS receiver    │
└──────────────────────────────────────────────────────────────────────┘
```

**Dependency rules**

1. `src/domain` never imports React, React Native, Expo or the database — it takes plain data and
   returns plain data, so it can be tested in Node.
2. Screens never run SQL; they call hooks, hooks call repositories.
3. Only `src/services` and repositories perform side effects.
4. Repositories expose `subscribe(cb)`; hooks reload when data changes, so every screen stays in sync.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 58, React Native 0.88 (New Architecture), React 19 + React Compiler |
| Language | TypeScript (strict) |
| Navigation | Expo Router (file-based, typed routes) |
| Database | `expo-sqlite` (WAL, foreign keys, migrations) |
| Secrets | `expo-secure-store` (Android Keystore / iOS Keychain) |
| Auth | `expo-local-authentication`, salted PIN hash via `expo-crypto` |
| Animation | `react-native-reanimated` 4, `expo-haptics`, `expo-linear-gradient` |
| Notifications | `expo-notifications` (local, scheduled) |
| Media/files | `expo-image-picker`, `expo-file-system`, `expo-clipboard` |
| Privacy | `expo-screen-capture` |
| Native | Kotlin `BroadcastReceiver` + `HeadlessJsTaskService` via config plugin |
| Build | EAS Build (cloud) |

---

## Project structure

```
Kasupilot/
├── app.json                 # Expo config (name, icons, permissions, plugins)
├── eas.json                 # EAS build profiles (development / preview APK / production AAB)
├── metro.config.js          # wasm + COOP/COEP headers (expo-sqlite on web)
├── plugins/
│   ├── withSmsReceiver.js   # config plugin: manifest entries + copies Kotlin sources
│   └── native-android/      # SmsBroadcastReceiver.kt, SmsHeadlessTaskService.kt
├── scripts/
│   └── make_icons.py        # regenerates the app icon set from KPLogo.png
├── assets/images/           # icon, adaptive icon layers, notification icon, splash video
└── src/
    ├── app/                 # screens
    │   ├── index.tsx            # Home dashboard
    │   ├── transactions.tsx     # Ledger
    │   ├── loans.tsx            # Loan cockpit + calendar
    │   ├── loan-form.tsx        # Add / edit loan
    │   ├── cards/               # index (list) · new (add/edit) · [id] (detail)
    │   ├── profile.tsx          # Profile, salary, security, export
    │   └── explore.tsx          # Analytics & envelopes
    ├── components/          # home · cards · loans · security · transaction · profile · ui
    ├── domain/              # money · loans · budget · cards · sms · profile · types.ts
    ├── data/
    │   ├── db/client.ts         # connection + migrations
    │   └── repositories/        # account · card · loan · salary · settings · transaction · profile
    ├── hooks/               # use-cases for screens
    ├── services/            # lock · cardVault · notificationService · smsIngestion · coldVaultBackup · …
    └── utils/               # date (local-time calendar maths) · id
```

---

## Getting started

### Prerequisites
- Node.js 20+ and npm
- An Android phone or emulator
- For native features (SMS, notifications, biometrics with all options): an EAS account

### Install and run
```bash
npm install
npx expo start            # press "a" for Android, "w" for web
```

> Expo Go runs the UI, ledger, cards, loans and lock screen. **Background SMS reading needs a real build**
> (EAS APK or `npx expo run:android`) because it uses custom native code.

### Quality checks
```bash
npx tsc --noEmit          # type check
npx expo lint             # lint
npx expo-doctor           # dependency / config health
```

> Always add packages with `npx expo install <package>` so versions match SDK 58 (see `AGENTS.md`).

---

## Building the Android APK

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

| Profile | Output | Use |
|---|---|---|
| `preview` | `.apk` | Install directly on a phone (personal testing) |
| `development` | `.apk` + dev client | Debugging with Metro |
| `production` | `.aab` | Play Store (not used) |

- The finished build shows a download link and QR code; it is also listed at expo.dev → project → Builds.
- **Updating without losing data:** install the new APK over the old one (do not uninstall). Increase
  `android.versionCode` in `app.json` for every build and keep the same EAS signing keystore.
- **First install on Android 13+:** allow *Install unknown apps*; for SMS, open
  *Settings → Apps → KasuPilot → ⋮ → Allow restricted settings*, then grant SMS and notification permissions.
  On Xiaomi/Oppo/Vivo/Samsung set *Battery → No restrictions* so reminders and SMS capture keep working.

---

## Data model

All money is stored as **integer paise**; interest rates as **basis points** (8.50 % = 850).

| Table | Purpose |
|---|---|
| `accounts` | Cards (debit/credit) and the built-in Cash account; balance = opening balance + confirmed ledger |
| `transactions` | Ledger; `source_ref` (unique) makes automatic entries idempotent — `salary:<date>`, `emi:<loan>:<n>` |
| `loans` | Loan register: principal, outstanding, rate, tenure, months paid, EMI, due day, paying account |
| `settings` | JSON settings: `profile`, `security`, `experience`, `salaryState` |

Card numbers, expiry and CVV are **not** in SQLite — see the security model.

---

## Security model

| Asset | Protection |
|---|---|
| Ledger, loans, settings | SQLite file in the app sandbox (not encrypted at DB level) |
| Card number / expiry / CVV | `expo-secure-store` (hardware keystore, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`); shown only after biometric/PIN |
| App PIN | Salted SHA-256 hash in the keystore; 5 wrong attempts → 30 s lockout |
| Screen | Screenshots blocked and app hidden in recents (configurable); always blocked on card screens |
| Backup file | PBKDF2-SHA256 (5 000 rounds) key from the PIN + SHA-256 counter-mode keystream XOR |

> ⚠️ **Backup strength:** the backup key is derived from a 4-digit PIN, so anyone holding the
> `.kasuvault` file could try all 10 000 PINs offline. Store backups only in private locations. A
> passphrase-based AES-256-GCM format is on the roadmap.

Storing CVV is a deliberate choice for this personal-use build and would not be permitted in a
Play Store / PCI-scoped product.

---

## SMS ingestion pipeline

```
Bank SMS arrives
   │
   ▼  SmsBroadcastReceiver.kt   joins multi-part SMS; app open → JS event, app closed → headless task
   ▼  smsBackgroundReceiver.ts  registered Headless JS task (KasuPilotSmsReceiverTask)
   ▼  smsIngestion.ts           duplicate check (ref no. + hash), bank / last-4 account matching
   ▼  domain/sms/parser.ts      sender → bank, debit/credit, amount, merchant
   ▼  transactions (pending_review)
   ▼  SMS review sheet          confirm · edit · ignore  →  confirmed ledger entry
```

Unknown formats are left unparsed rather than guessed; an unmatched bank/card is flagged for the user.

---

## Conventions

- **Money:** never use floating-point rupees for storage; convert at the edges with `toPaise` / `formatPaise`
  (Indian grouping: ₹ 12,34,567).
- **Dates:** month and salary-cycle boundaries are computed in **local time** (`src/utils/date.ts`) and then
  converted to ISO instants; due days are clamped to the month length (31 → 28/29 Feb).
- **Migrations:** forward-only, each in one transaction with its `user_version` bump (`src/data/db/client.ts`).
- **Hooks:** load in an effect with an `active` flag and set state only in async callbacks
  (lint rule `react-hooks/set-state-in-effect`).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:` …).

---

## Known limitations

- No automated tests yet — domain maths and the SMS parser are verified manually.
- iOS cannot read SMS; iOS users rely on manual entry.
- Credits that arrive without any SMS (e.g. some government refunds) must be added manually.
- Paying a credit-card bill from a debit card is recorded as two expenses until a *transfer* type exists.

---

## Roadmap

1. Unit tests (Jest + fast-check) for `domain/` and SMS parser fixtures; CI.
2. Transfer transaction type, transaction edit, back-dated entries.
3. Balance reconciliation: enter the real bank balance, book the difference.
4. Passphrase-based AES-256-GCM backup format.
5. Credit-card statement cycle, recurring entries, category budgets.
6. Tamil UI, home-screen widget, voice and receipt OCR entry.

---

## Related documents

| File | Contents |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Full product and technical specification |
| [`AGENTS.md`](AGENTS.md) | Rules for coding agents working on this repo (Expo SDK 58 specifics) |
| [`LICENSE`](LICENSE) | License file |
