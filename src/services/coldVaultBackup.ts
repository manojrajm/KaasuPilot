import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { getDb } from '@/data/db/client';
import { accountRepo } from '@/data/repositories/accountRepo';
import { categoryRepo } from '@/data/repositories/categoryRepo';
import { loanRepo } from '@/data/repositories/loanRepo';
import { settingsRepo } from '@/data/repositories/settingsRepo';
import { transactionRepo } from '@/data/repositories/transactionRepo';

type Row = Record<string, string | number | null>;
type Db = Awaited<ReturnType<typeof getDb>>;

/** Settings that belong to the device (lock PIN / biometrics) and are never exported. */
const EXCLUDED_SETTINGS = ['security'];

export const MIN_PASSPHRASE_LENGTH = 6;

export type RestoreMode = 'merge' | 'replace';

export interface ColdVaultExportPayload {
  app: 'KasuPilot';
  version: string;
  exportedAt: string;
  checksum: string;
  /** Database schema version the rows were exported from (v4+). */
  schemaVersion?: number;
  /** Raw table rows (v4+): an exact copy of the ledger. */
  tables?: {
    accounts: Row[];
    transactions: Row[];
    loans: Row[];
    settings: Row[];
    categories?: Row[];
  };
  // Legacy (v3) shape
  accounts?: any[];
  cards?: any[];
  loans?: any[];
  transactions?: any[];
  settings?: any;
}

export interface EncryptedVaultContainer {
  format: 'KASUVAULT_AES256';
  version: string;
  timestamp: string;
  /** Key-derivation rounds; absent in v3 files (5,000). */
  kdfRounds?: number;
  salt: string;
  iv: string;
  ciphertext: string;
  hmac: string;
}

const LEGACY_KDF_ROUNDS = 5000;
const KDF_ROUNDS = 10000;

/** Key derivation from the passphrase by repeated SHA-256. */
async function deriveKey(pin: string, salt: string, rounds: number): Promise<string> {
  let current = pin + ':' + salt;
  for (let i = 0; i < rounds; i++) {
    current = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, current);
  }
  return current;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** XORs data with a SHA-256 counter keystream. Encrypt and decrypt are the same operation. */
async function xorKeystream(bytes: Uint8Array, keyHex: string, ivHex: string): Promise<Uint8Array> {
  const out = new Uint8Array(bytes.length);
  let blockIndex = 0;
  let keystreamBlock: Uint8Array = new Uint8Array(0);
  let keystreamPos = 32;

  for (let i = 0; i < bytes.length; i++) {
    if (keystreamPos >= 32) {
      const blockHashHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${keyHex}:${ivHex}:${blockIndex}`
      );
      keystreamBlock = new Uint8Array(32);
      for (let j = 0; j < 32; j++) {
        keystreamBlock[j] = parseInt(blockHashHex.substr(j * 2, 2), 16);
      }
      keystreamPos = 0;
      blockIndex++;
    }
    out[i] = bytes[i] ^ keystreamBlock[keystreamPos];
    keystreamPos++;
  }
  return out;
}

async function cryptBytes(text: string, keyHex: string, ivHex: string): Promise<string> {
  return bytesToBase64(await xorKeystream(new TextEncoder().encode(text), keyHex, ivHex));
}

async function decryptBytes(base64Cipher: string, keyHex: string, ivHex: string): Promise<string> {
  return new TextDecoder().decode(await xorKeystream(base64ToBytes(base64Cipher), keyHex, ivHex));
}

/** Inserts rows using only columns that exist in the current table (names are never trusted blindly). */
async function insertRows(db: Db, table: string, rows: Row[] | undefined): Promise<number> {
  if (!Array.isArray(rows) || rows.length === 0) return 0;
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const valid = new Set(info.map((c) => c.name));
  for (const row of rows) {
    const cols = Object.keys(row).filter((c) => valid.has(c));
    if (cols.length === 0) continue;
    await db.runAsync(
      `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      ...cols.map((c) => row[c] ?? null)
    );
  }
  return rows.length;
}

/** Restores a v3 file (field-by-field mapping from domain objects). */
async function restoreLegacy(
  db: Db,
  payload: ColdVaultExportPayload
): Promise<{ transactions: number; loans: number; accounts: number }> {
  const now = new Date().toISOString();
  for (const acc of payload.accounts ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO accounts
        (id, name, type, institution, last_four_digits, opening_balance_paise, color,
         card_kind, bank_code, network, holder_name, credit_limit_paise, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      acc.id,
      acc.name,
      acc.type,
      acc.institution ?? null,
      acc.lastFourDigits ?? null,
      acc.currentBalancePaise ?? 0,
      acc.color ?? '#00F0FF',
      acc.cardKind ?? null,
      acc.bankCode ?? null,
      acc.network ?? null,
      acc.holderName ?? null,
      acc.creditLimitPaise ?? null,
      now,
      now
    );
  }
  for (const l of payload.loans ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO loans
        (id, name, type, lender, principal_paise, balance_paise, annual_rate_bps,
         tenure_months, months_paid, start_date, emi_paise, emi_is_custom, due_day,
         processing_fee_paise, prepayments_paise, account_id, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      l.id,
      l.name,
      l.type,
      l.lender,
      l.principalPaise,
      l.balancePaise,
      l.annualRateBps,
      l.tenureMonths,
      l.monthsPaid ?? 0,
      l.startDate,
      l.emiPaise,
      l.emiIsCustom ? 1 : 0,
      l.dueDay,
      l.processingFeePaise ?? 0,
      l.prepaymentsPaise ?? 0,
      l.accountId,
      l.status,
      l.createdAt ?? now,
      now
    );
  }
  for (const t of payload.transactions ?? []) {
    await db.runAsync(
      `INSERT OR REPLACE INTO transactions
        (id, account_id, amount_paise, direction, category_id, merchant, note,
         txn_date, source, status, tax_tag, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      t.id,
      t.accountId,
      t.amountPaise,
      t.direction,
      t.categoryId,
      t.merchant,
      t.note ?? null,
      t.txnDate,
      t.source,
      t.status,
      t.taxTag ?? null,
      t.createdAt ?? now,
      now
    );
  }
  if (payload.settings?.profile) {
    await db.runAsync(
      `INSERT INTO settings (key, value_json) VALUES ('profile', ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
      JSON.stringify(payload.settings.profile)
    );
  }
  return {
    transactions: payload.transactions?.length ?? 0,
    loans: payload.loans?.length ?? 0,
    accounts: payload.accounts?.length ?? 0,
  };
}

export const coldVaultBackupService = {
  /** Encrypts the whole ledger with the given passphrase and writes a .kasuvault file. */
  async createEncryptedVault(pin: string): Promise<{
    vaultJson: string;
    fileUri: string | null;
    meta: { transactionsCount: number; loansCount: number; cardsCount: number };
  }> {
    const db = await getDb();
    const accounts = await db.getAllAsync<Row>('SELECT * FROM accounts');
    const transactions = await db.getAllAsync<Row>('SELECT * FROM transactions');
    const loans = await db.getAllAsync<Row>('SELECT * FROM loans');
    const categories = await db.getAllAsync<Row>('SELECT * FROM categories');
    const settings = (await db.getAllAsync<Row>('SELECT * FROM settings')).filter(
      (r) => !EXCLUDED_SETTINGS.includes(String(r.key))
    );
    const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');

    const tables = { accounts, transactions, loans, settings, categories };
    const checksum = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      JSON.stringify(tables)
    );
    const rawPayload: ColdVaultExportPayload = {
      app: 'KasuPilot',
      version: '4.0.0',
      exportedAt: new Date().toISOString(),
      checksum,
      schemaVersion: versionRow?.user_version ?? 0,
      tables,
    };

    const salt = Crypto.randomUUID().replace(/-/g, '');
    const iv = Crypto.randomUUID().replace(/-/g, '');
    const key = await deriveKey(pin, salt, KDF_ROUNDS);
    const ciphertext = await cryptBytes(JSON.stringify(rawPayload), key, iv);
    const hmac = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}:${ciphertext}:${salt}`
    );

    const container: EncryptedVaultContainer = {
      format: 'KASUVAULT_AES256',
      version: '4.0.0',
      timestamp: new Date().toISOString(),
      kdfRounds: KDF_ROUNDS,
      salt,
      iv,
      ciphertext,
      hmac,
    };
    const vaultString = JSON.stringify(container);

    let fileUri: string | null = null;
    try {
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (baseDir) {
        fileUri = `${baseDir}KasuPilot_Vault_${dateStr}.kasuvault`;
        await FileSystem.writeAsStringAsync(fileUri, vaultString, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }
    } catch (e) {
      console.warn('Could not write to local filesystem', e);
      fileUri = null;
    }

    return {
      vaultJson: vaultString,
      fileUri,
      meta: {
        transactionsCount: transactions.length,
        loansCount: loans.length,
        cardsCount: accounts.filter((a) => a.card_kind).length,
      },
    };
  },

  /** Opens the share sheet for the file (Save to Drive / Files / WhatsApp ...). */
  async shareVault(fileUri: string | null, vaultJson: string): Promise<boolean> {
    try {
      if (fileUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Save KasuPilot backup',
          UTI: 'public.data',
        });
        return true;
      }
      await Clipboard.setStringAsync(vaultJson);
      return false;
    } catch (err) {
      console.warn('Share canceled or failed', err);
      await Clipboard.setStringAsync(vaultJson);
      return false;
    }
  },

  /** Lets the user choose a .kasuvault file and returns its text, or null if cancelled. */
  async pickVaultFile(): Promise<{ name: string; content: string } | null> {
    const res = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.length) return null;
    const asset = res.assets[0];
    const content = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return { name: asset.name, content };
  },

  /**
   * Decrypts and restores a .kasuvault container.
   * - merge: adds/updates records from the file and keeps everything else.
   * - replace: wipes transactions, loans and accounts first, so the device matches the file exactly.
   */
  async restoreEncryptedVault(
    vaultContent: string,
    pin: string,
    mode: RestoreMode = 'merge'
  ): Promise<{
    success: boolean;
    error?: string;
    restoredCount?: { transactions: number; loans: number; accounts: number };
  }> {
    let container: EncryptedVaultContainer;
    try {
      container = JSON.parse(vaultContent.trim().replace(/^﻿/, ''));
      if (container.format !== 'KASUVAULT_AES256' || !container.ciphertext || !container.salt) {
        return { success: false, error: 'Invalid file format. Must be a valid .kasuvault container.' };
      }
    } catch {
      return { success: false, error: 'Could not parse vault file. Invalid JSON data.' };
    }

    const key = await deriveKey(pin, container.salt, container.kdfRounds ?? LEGACY_KDF_ROUNDS);
    const expectedHmac = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}:${container.ciphertext}:${container.salt}`
    );
    if (expectedHmac !== container.hmac) {
      return { success: false, error: 'Incorrect passphrase, or the file is damaged.' };
    }

    let payload: ColdVaultExportPayload;
    try {
      payload = JSON.parse(await decryptBytes(container.ciphertext, key, container.iv));
    } catch {
      return { success: false, error: 'Decrypted data is corrupted.' };
    }

    const db = await getDb();
    const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (payload.schemaVersion && versionRow && payload.schemaVersion > versionRow.user_version) {
      return {
        success: false,
        error: 'This backup was made by a newer version of KasuPilot. Update the app and try again.',
      };
    }

    if (payload.tables) {
      const checksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        JSON.stringify(payload.tables)
      );
      if (checksum !== payload.checksum) {
        return { success: false, error: 'Backup integrity check failed.' };
      }
    }

    try {
      let counts = { transactions: 0, loans: 0, accounts: 0 };
      await db.withTransactionAsync(async () => {
        if (mode === 'replace') {
          await db.runAsync('DELETE FROM transactions');
          await db.runAsync('DELETE FROM loans');
          await db.runAsync('DELETE FROM accounts');
        }

        if (payload.tables) {
          // Accounts first: transactions and loans reference them.
          counts.accounts = await insertRows(db, 'accounts', payload.tables.accounts);
          counts.transactions = await insertRows(db, 'transactions', payload.tables.transactions);
          counts.loans = await insertRows(db, 'loans', payload.tables.loans);
          const settingRows = (payload.tables.settings || []).filter(
            (r) => !EXCLUDED_SETTINGS.includes(String(r.key))
          );
          await insertRows(db, 'settings', settingRows);
          if (payload.tables.categories) {
            await insertRows(db, 'categories', payload.tables.categories);
          }
        } else {
          counts = await restoreLegacy(db, payload);
        }

        // The built-in cash account must exist even after a replace.
        const now = new Date().toISOString();
        await db.runAsync(
          `INSERT OR IGNORE INTO accounts (id, name, type, opening_balance_paise, color, created_at, updated_at)
           VALUES ('acc_cash', 'Cash', 'cash', 0, '#2E7D32', ?, ?)`,
          now,
          now
        );
      });

      transactionRepo.notifyChanged();
      loanRepo.notifyChanged();
      accountRepo.notifyChanged();
      categoryRepo.notifyChanged();
      settingsRepo.notifyChanged();

      return { success: true, restoredCount: counts };
    } catch (dbErr) {
      console.error('Database restore error:', dbErr);
      return { success: false, error: 'Database transaction failed during restore. Nothing was changed.' };
    }
  },
};
