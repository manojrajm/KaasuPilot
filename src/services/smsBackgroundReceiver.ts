import { AppRegistry, DeviceEventEmitter, PermissionsAndroid, Platform } from 'react-native';
import { createId } from '@/utils/id';
import { notificationService } from './notificationService';
import { smsIngestionService } from './smsIngestion';

export interface SmsPayload {
  sender: string;
  body: string;
  timestamp?: number;
}

/**
 * Handles incoming raw SMS data received either through:
 * 1. Foreground DeviceEventEmitter ('KasuPilotSmsReceived')
 * 2. Background HeadlessJsTask ('KasuPilotSmsReceiverTask')
 */
export async function processIncomingSmsPayload(payload: SmsPayload): Promise<boolean> {
  try {
    if (!payload.body || !payload.sender) return false;

    console.log(`[KasuPilotSmsReceiver] Processing SMS from ${payload.sender}`);

    const result = await smsIngestionService.ingestSms({
      id: createId('sms'),
      sender: payload.sender,
      body: payload.body,
      timestamp: payload.timestamp || Date.now(),
    });

    if (result.accepted && !result.isDuplicate && result.transaction) {
      console.log(`[KasuPilotSmsReceiver] Transaction recorded: ${result.transaction.merchant} (${result.transaction.amountPaise} paise)`);

      // Trigger high-priority push notification alert on device
      await notificationService.sendTransactionAlert({
        amountPaise: result.transaction.amountPaise,
        merchant: result.transaction.merchant,
        direction: result.transaction.direction,
        bank: payload.sender,
      });

      return true;
    }

    if (result.isDuplicate) {
      console.log('[KasuPilotSmsReceiver] Duplicate SMS transaction skipped.');
    }

    return false;
  } catch (error) {
    console.error('[KasuPilotSmsReceiver] Error processing SMS payload', error);
    return false;
  }
}

// -------------------------------------------------------------
// HEADLESS JS TASK REGISTRATION (ANDROID BACKGROUND & SLEEP MODE)
// -------------------------------------------------------------
// Must be registered at bundle evaluation time on Android so the OS can invoke it
// even when the UI Activity is not running.
if (Platform.OS === 'android' && typeof AppRegistry.registerHeadlessTask === 'function') {
  AppRegistry.registerHeadlessTask('KasuPilotSmsReceiverTask', () => async (taskData: SmsPayload) => {
    console.log('[HeadlessJS] KasuPilotSmsReceiverTask awakened by Android BroadcastReceiver');
    await processIncomingSmsPayload(taskData);
  });
}

export const smsBackgroundReceiver = {
  privateListenerAttached: false,

  /**
   * Initializes foreground event listener for incoming SMS.
   */
  init(): void {
    if (Platform.OS !== 'android') return;

    if (!this.privateListenerAttached) {
      DeviceEventEmitter.addListener('KasuPilotSmsReceived', async (event: SmsPayload) => {
        console.log('[ForegroundEventEmitter] KasuPilotSmsReceived event caught');
        await processIncomingSmsPayload(event);
      });
      this.privateListenerAttached = true;
    }
  },

  /**
   * Requests runtime Android SMS permissions (RECEIVE_SMS and READ_SMS).
   * Required on Android 6.0+ before incoming broadcasts can be read by APK.
   */
  async requestSmsPermissions(): Promise<{
    granted: boolean;
    receiveSms: boolean;
    readSms: boolean;
  }> {
    if (Platform.OS !== 'android') {
      return { granted: false, receiveSms: false, readSms: false };
    }

    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      ]);

      const receiveSms = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED;
      const readSms = results[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;

      return {
        granted: receiveSms && readSms,
        receiveSms,
        readSms,
      };
    } catch (err) {
      console.warn('[smsBackgroundReceiver] Permission request error', err);
      return { granted: false, receiveSms: false, readSms: false };
    }
  },

  /**
   * Checks if Android SMS permissions are currently granted.
   */
  async hasSmsPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
      const hasReceive = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
      return hasReceive;
    } catch {
      return false;
    }
  },
};
