import { AppState, PermissionsAndroid, Platform } from 'react-native';

import { isSmsInboxAvailable, readRecentSms } from '../../modules/sms-inbox';
import { settingsRepo } from '@/data/repositories/settingsRepo';
import { smsIngestionService } from './smsIngestion';

/*
 * Inbox catch-up: re-reads recent SMS from the phone's inbox and feeds them through the same
 * ingestion pipeline as live capture. Anything already recorded is skipped by the ledger's
 * unique source_ref (bank reference number, or the 5-minute fuzzy key), so a scan never
 * creates duplicates. This covers SMS missed while the app was force-stopped or restricted.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** First automatic scan looks back this far; later scans continue from the last scanned SMS. */
const AUTO_FIRST_LOOKBACK_MS = 3 * DAY;
const AUTO_MAX_MESSAGES = 50;
/** Re-read a little before the last scan point, in case an SMS was written to the inbox late. */
const AUTO_OVERLAP_MS = 10 * MINUTE;
/** Do not auto-scan more often than this when the app is reopened repeatedly. */
const AUTO_MIN_INTERVAL_MS = MINUTE;

const MANUAL_LIMIT = 20;
const MANUAL_LOOKBACK_MS = 7 * DAY;

export type InboxScanStatus = 'ok' | 'unavailable' | 'no_permission' | 'busy' | 'error';

export interface InboxScanResult {
  status: InboxScanStatus;
  /** SMS read from the inbox. */
  scanned: number;
  /** New transactions added for review. */
  added: number;
  /** Already in KasuPilot (or merged with a receipt), so skipped. */
  duplicates: number;
  /** Not bank transactions (OTP, promotions, personal messages). */
  notFinancial: number;
  error?: string;
}

const empty = (status: InboxScanStatus, error?: string): InboxScanResult => ({
  status,
  scanned: 0,
  added: 0,
  duplicates: 0,
  notFinancial: 0,
  error,
});

let inFlight: Promise<InboxScanResult> | null = null;
let lastAutoScanAt = 0;

async function hasReadSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  } catch {
    return false;
  }
}

async function runScan(limit: number, sinceMs: number): Promise<InboxScanResult> {
  if (!isSmsInboxAvailable()) return empty('unavailable');
  if (!(await hasReadSmsPermission())) return empty('no_permission');

  try {
    // Oldest first, so receipts and bank debits merge in the order they arrived.
    const messages = (await readRecentSms(limit, sinceMs)).reverse();
    const result = empty('ok');
    let newest = 0;

    for (const sms of messages) {
      result.scanned++;
      newest = Math.max(newest, sms.date);
      const ingested = await smsIngestionService.ingestSms({
        id: `inbox_${sms.id}`,
        sender: sms.sender,
        body: sms.body,
        // Same timestamp the live receiver uses, so the duplicate key matches.
        timestamp: sms.dateSent > 0 ? sms.dateSent : sms.date,
      });
      if (!ingested.accepted) result.notFinancial++;
      else if (ingested.isDuplicate) result.duplicates++;
      else result.added++;
    }

    if (newest > 0) {
      const state = await settingsRepo.get('smsScan');
      if (!state.lastScannedAt || newest > state.lastScannedAt) {
        await settingsRepo.set('smsScan', { lastScannedAt: newest });
      }
    }
    return result;
  } catch (error) {
    console.warn('[SmsInboxScanner] Scan failed', error);
    return empty('error', error instanceof Error ? error.message : String(error));
  }
}

/** Runs one scan at a time; a second caller waits for the scan already in progress. */
function exclusive(task: () => Promise<InboxScanResult>): Promise<InboxScanResult> {
  if (inFlight) return inFlight;
  inFlight = task().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export const smsInboxScanner = {
  isAvailable: isSmsInboxAvailable,

  /** "Scan inbox" button: the last 20 SMS from the past 7 days. */
  scanRecent(): Promise<InboxScanResult> {
    return exclusive(() => runScan(MANUAL_LIMIT, Date.now() - MANUAL_LOOKBACK_MS));
  },

  /** Automatic catch-up: every SMS since the last scan (first run: the past 3 days). */
  async autoScan(): Promise<InboxScanResult> {
    const now = Date.now();
    if (now - lastAutoScanAt < AUTO_MIN_INTERVAL_MS) return empty('busy');
    lastAutoScanAt = now;
    const { lastScannedAt } = await settingsRepo.get('smsScan');
    const since = lastScannedAt ? lastScannedAt - AUTO_OVERLAP_MS : now - AUTO_FIRST_LOOKBACK_MS;
    return exclusive(() => runScan(AUTO_MAX_MESSAGES, since));
  },

  /** Scans now and every time the app returns to the foreground. Returns an unsubscribe function. */
  startAutoScan(): () => void {
    if (Platform.OS !== 'android' || !isSmsInboxAvailable()) return () => {};
    smsInboxScanner.autoScan().catch(() => {});
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') smsInboxScanner.autoScan().catch(() => {});
    });
    return () => sub.remove();
  },
};
