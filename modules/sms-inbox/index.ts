import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export interface InboxSms {
  id: string;
  sender: string;
  body: string;
  /** When the phone received it (epoch ms). */
  date: number;
  /** Service-centre timestamp (epoch ms); 0 on some devices. */
  dateSent: number;
}

interface SmsInboxNative {
  readRecentAsync(limit: number, sinceMs: number): Promise<InboxSms[]>;
}

// Optional so the app still runs in Expo Go, on web and on APKs built before this module existed.
const native = Platform.OS === 'android' ? requireOptionalNativeModule<SmsInboxNative>('SmsInbox') : null;

/** True when the native inbox reader is compiled into this build. */
export function isSmsInboxAvailable(): boolean {
  return native !== null;
}

/** Newest-first inbox SMS received at or after `sinceMs`, at most `limit`. */
export async function readRecentSms(limit: number, sinceMs: number): Promise<InboxSms[]> {
  if (!native) return [];
  return native.readRecentAsync(limit, sinceMs);
}
