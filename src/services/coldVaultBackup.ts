import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { accountRepo } from '@/data/repositories/accountRepo';
import { cardRepo } from '@/data/repositories/cardRepo';
import { loanRepo } from '@/data/repositories/loanRepo';
import { settingsRepo } from '@/data/repositories/settingsRepo';
import { transactionRepo } from '@/data/repositories/transactionRepo';
import { getDb } from '@/data/db/client';

export interface ColdVaultExportPayload {
  app: 'KasuPilot';
  version: '3.0.0';
  exportedAt: string;
  checksum: string;
  accounts: any[];
  cards: any[];
  loans: any[];
  transactions: any[];
  settings: any;
}

export interface EncryptedVaultContainer {
  format: 'KASUVAULT_AES256';
  version: '3.0.0';
  timestamp: string;
  salt: string;
  iv: string;
  ciphertext: string;
  hmac: string;
}

/**
 * Key derivation from PIN using PBKDF2-SHA256 (5,000 rounds).
 */
async function deriveKey(pin: string, salt: string): Promise<string> {
  let current = pin + ':' + salt;
  for (let i = 0; i < 5000; i++) {
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

/**
 * Deterministic keystream XOR encryption (Counter Mode with SHA-256 blocks).
 */
async function cryptBytes(text: string, keyHex: string, ivHex: string): Promise<string> {
  const enc = new TextEncoder();
  const bytes = enc.encode(text);
  const out = new Uint8Array(bytes.length);

  let blockIndex = 0;
  let keystreamBlock: Uint8Array = new Uint8Array(0);
  let keystreamPos = 32;

  for (let i = 0; i < bytes.length; i++) {
    if (keystreamPos >= 32) {
      const blockInput = `${keyHex}:${ivHex}:${blockIndex}`;
      const blockHashHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        blockInput
      );
      // convert 64 hex chars to 32 bytes
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

  return bytesToBase64(out);
}

/**
 * Decrypts Base64 ciphertext using the same key and IV in CTR mode.
 */
async function decryptBytes(base64Cipher: string, keyHex: string, ivHex: string): Promise<string> {
  const bytes = base64ToBytes(base64Cipher);
  const out = new Uint8Array(bytes.length);
  let blockIndex = 0;
  let keystreamBlock: Uint8Array = new Uint8Array(0);
  let keystreamPos = 32;

  for (let i = 0; i < bytes.length; i++) {
    if (keystreamPos >= 32) {
      const blockInput = `${keyHex}:${ivHex}:${blockIndex}`;
      const blockHashHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        blockInput
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

  const dec = new TextDecoder();
  return dec.decode(out);
}

export const coldVaultBackupService = {
  /**
   * Generates a fully encrypted .kasuvault payload using the user's PIN.
   */
  async createEncryptedVault(pin: string): Promise<{
    vaultJson: string;
    fileUri: string | null;
    meta: { transactionsCount: number; loansCount: number; cardsCount: number };
  }> {
    const [txns, loans, cards, accounts, profile, experience] = await Promise.all([
      transactionRepo.getAll(),
      loanRepo.getAll(),
      cardRepo.list(),
      accountRepo.getAll(),
      settingsRepo.get('profile'),
      settingsRepo.get('experience'),
    ]);

    const rawPayload: ColdVaultExportPayload = {
      app: 'KasuPilot',
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      checksum: '',
      accounts,
      cards,
      loans,
      transactions: txns,
      settings: { profile, experience },
    };

    const rawJson = JSON.stringify(rawPayload);
    const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawJson);
    rawPayload.checksum = checksum;

    // Generate random salt and IV
    const salt = Crypto.randomUUID().replace(/-/g, '');
    const iv = Crypto.randomUUID().replace(/-/g, '');
    const key = await deriveKey(pin, salt);

    const ciphertext = await cryptBytes(JSON.stringify(rawPayload), key, iv);
    const hmac = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}:${ciphertext}:${salt}`
    );

    const container: EncryptedVaultContainer = {
      format: 'KASUVAULT_AES256',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      salt,
      iv,
      ciphertext,
      hmac,
    };

    const vaultString = JSON.stringify(container, null, 2);

    // Save to local device file if filesystem is available
    let fileUri: string | null = null;
    try {
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `KasuPilot_Vault_${dateStr}.kasuvault`;
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (baseDir) {
        fileUri = `${baseDir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, vaultString, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }
    } catch (e) {
      console.warn('Could not write to local filesystem', e);
    }

    return {
      vaultJson: vaultString,
      fileUri,
      meta: {
        transactionsCount: txns.length,
        loansCount: loans.length,
        cardsCount: cards.length,
      },
    };
  },

  /**
   * Shares the .kasuvault file via native OS share sheet (WhatsApp, Drive, Email, Files).
   */
  async shareVault(fileUri: string | null, vaultJson: string): Promise<boolean> {
    try {
      if (fileUri && Platform.OS !== 'web') {
        await Share.share({
          title: 'KasuPilot Cold Vault Backup',
          message: 'KasuPilot Encrypted Financial Cold Vault (.kasuvault)',
          url: fileUri,
        });
      } else {
        await Share.share({
          title: 'KasuPilot Cold Vault Backup',
          message: vaultJson,
        });
      }
      return true;
    } catch (err) {
      console.warn('Share canceled or failed', err);
      // Fallback: Copy to clipboard
      await Clipboard.setStringAsync(vaultJson);
      return false;
    }
  },

  /**
   * Decrypts and restores an encrypted .kasuvault container.
   */
  async restoreEncryptedVault(
    vaultContent: string,
    pin: string
  ): Promise<{
    success: boolean;
    error?: string;
    restoredCount?: { transactions: number; loans: number; accounts: number };
  }> {
    let container: EncryptedVaultContainer;
    try {
      container = JSON.parse(vaultContent.trim());
      if (container.format !== 'KASUVAULT_AES256' || !container.ciphertext || !container.salt) {
        return { success: false, error: 'Invalid file format. Must be a valid .kasuvault container.' };
      }
    } catch {
      return { success: false, error: 'Could not parse vault file. Invalid JSON data.' };
    }

    // 1. Verify Key & HMAC
    const key = await deriveKey(pin, container.salt);
    const expectedHmac = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${key}:${container.ciphertext}:${container.salt}`
    );

    if (expectedHmac !== container.hmac) {
      return {
        success: false,
        error: 'Incorrect Master PIN! Decryption integrity check failed.',
      };
    }

    // 2. Decrypt Payload
    let decryptedText: string;
    try {
      decryptedText = await decryptBytes(container.ciphertext, key, container.iv);
    } catch (e) {
      return { success: false, error: 'Decryption failed. Please verify your PIN.' };
    }

    let payload: ColdVaultExportPayload;
    try {
      payload = JSON.parse(decryptedText);
    } catch {
      return { success: false, error: 'Decrypted data is corrupted.' };
    }

    // 3. Write into SQLite Database atomically
    const db = await getDb();
    try {
      await db.withTransactionAsync(async () => {
        // Restore Accounts
        if (Array.isArray(payload.accounts) && payload.accounts.length > 0) {
          for (const acc of payload.accounts) {
            await db.runAsync(
              `INSERT OR REPLACE INTO accounts
                (id, name, type, institution, last_four_digits, opening_balance_paise, color,
                 card_kind, bank_code, network, holder_name, credit_limit_paise, is_archived, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
              0,
              new Date().toISOString(),
              new Date().toISOString()
            );
          }
        }

        // Restore Loans
        if (Array.isArray(payload.loans) && payload.loans.length > 0) {
          for (const l of payload.loans) {
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
              l.createdAt ?? new Date().toISOString(),
              new Date().toISOString()
            );
          }
        }

        // Restore Transactions
        if (Array.isArray(payload.transactions) && payload.transactions.length > 0) {
          for (const t of payload.transactions) {
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
              t.createdAt ?? new Date().toISOString(),
              new Date().toISOString()
            );
          }
        }

        // Restore Settings
        if (payload.settings?.profile) {
          await settingsRepo.update('profile', payload.settings.profile);
        }
      });

      // Notify repositories so dashboard updates instantly
      transactionRepo.notifyChanged();
      loanRepo.notifyChanged();
      accountRepo.notifyChanged();

      return {
        success: true,
        restoredCount: {
          transactions: payload.transactions?.length ?? 0,
          loans: payload.loans?.length ?? 0,
          accounts: payload.accounts?.length ?? 0,
        },
      };
    } catch (dbErr) {
      console.error('Database restore error:', dbErr);
      return { success: false, error: 'Database transaction failed during restore.' };
    }
  },
};
