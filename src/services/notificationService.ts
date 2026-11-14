import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { loanRepo } from '@/data/repositories/loanRepo';
import { formatPaise } from '@/domain/money/format';
import { Loan } from '@/domain/types';

// Global handler configuration for foreground notifications
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.warn('[NotificationService] setNotificationHandler warning:', e);
}

export const notificationService = {
  /**
   * Initializes high-priority Android notification channels and OS configs.
   */
  async init(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('emi-reminders', {
        name: 'EMI Due Alerts & Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00F0FF',
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('telemetry-alerts', {
        name: 'Financial Telemetry & Spends',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        lightColor: '#FFB800',
      });
    }
  },

  /**
   * Checks and requests OS notification permission.
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Could not request notification permissions', e);
      return false;
    }
  },

  /**
   * Checks if permission is currently granted.
   */
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  },

  /**
   * Sends an immediate local test notification to verify the engine.
   */
  async sendTestNotification(): Promise<boolean> {
    const granted = await this.requestPermission();
    if (!granted) return false;

    await this.init();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚡ KasuPilot Push Telemetry Active',
        body: 'Native notification service operational! EMI alarms and financial reminders are active.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'test' },
      },
      trigger: null, // deliver immediately
    });

    return true;
  },

  /**
   * Posts an immediate high-priority alert when a background SMS is intercepted and recorded.
   */
  async sendTransactionAlert(details: {
    amountPaise: number;
    merchant: string;
    direction: string;
    bank?: string;
  }): Promise<boolean> {
    try {
      const granted = await this.hasPermission();
      if (!granted) return false;

      await this.init();

      const isDebit = details.direction === 'debit';
      const title = isDebit
        ? `⚡ Spend Logged: ${formatPaise(details.amountPaise)}`
        : `💰 Credit Logged: ${formatPaise(details.amountPaise)}`;
      const body = `${details.merchant}${details.bank ? ` (${details.bank})` : ''} · Stored in Pending Review. Tap to confirm.`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: { type: 'sms_transaction' },
        },
        trigger: null,
      });

      return true;
    } catch (err) {
      console.warn('[NotificationService] sendTransactionAlert error:', err);
      return false;
    }
  },

  /**
   * Reconciles and schedules automated T-3, T-1, and T-0 push reminders for all active loans.
   */
  async reconcileEmiReminders(): Promise<{ scheduledCount: number; activeLoans: number }> {
    const granted = await this.requestPermission();
    if (!granted) return { scheduledCount: 0, activeLoans: 0 };

    await this.init();

    // 1. Cancel previous EMI reminder alarms
    await Notifications.cancelAllScheduledNotificationsAsync();

    // 2. Fetch all active loans
    const loans = await loanRepo.getAll();
    const activeLoans = loans.filter((l) => l.status === 'active');
    const now = new Date();
    let scheduledCount = 0;

    for (const loan of activeLoans) {
      const dueDay = Math.min(Math.max(1, loan.dueDayOfMonth || 5), 28); // Cap at 28 to be safe across all months

      // Find upcoming due dates for current month and next month
      const candidateDates: Date[] = [
        new Date(now.getFullYear(), now.getMonth(), dueDay, 8, 30, 0),
        new Date(now.getFullYear(), now.getMonth() + 1, dueDay, 8, 30, 0),
      ];

      for (const dueDate of candidateDates) {
        // T-3 Days Reminder (at 9:00 AM)
        const tMinus3 = new Date(dueDate.getTime() - 3 * 86400000);
        tMinus3.setHours(9, 0, 0, 0);
        if (tMinus3 > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⚡ 3 Days Left: ${loan.name} EMI`,
              body: `${formatPaise(loan.emiPaise)} is due on ${dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Ensure sufficient balance.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              data: { loanId: loan.id, type: 'emi_t_minus_3' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: tMinus3,
              channelId: 'emi-reminders',
            },
          });
          scheduledCount++;
        }

        // T-1 Day Reminder (at 9:00 AM)
        const tMinus1 = new Date(dueDate.getTime() - 1 * 86400000);
        tMinus1.setHours(9, 0, 0, 0);
        if (tMinus1 > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⚠️ Tomorrow: ${loan.name} EMI Due`,
              body: `${formatPaise(loan.emiPaise)} due tomorrow! Maintain balance to avoid late payment penalty.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
              data: { loanId: loan.id, type: 'emi_t_minus_1' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: tMinus1,
              channelId: 'emi-reminders',
            },
          });
          scheduledCount++;
        }

        // T-0 Day Reminder (at 8:30 AM)
        if (dueDate > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🚨 Today: ${loan.name} EMI Due`,
              body: `${formatPaise(loan.emiPaise)} will be debited today. Tap to record and reconcile ledger.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
              data: { loanId: loan.id, type: 'emi_due_today' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: dueDate,
              channelId: 'emi-reminders',
            },
          });
          scheduledCount++;
        }
      }
    }

    return { scheduledCount, activeLoans: activeLoans.length };
  },
};
