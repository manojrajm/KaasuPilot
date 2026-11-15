import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { VideoSplashOverlay } from '@/components/video-splash';
import AppTabs from '@/components/app-tabs';
import { LockProvider } from '@/components/security/LockProvider';
import { notificationService } from '@/services/notificationService';
import { smsBackgroundReceiver } from '@/services/smsBackgroundReceiver';
import { smsInboxScanner } from '@/services/smsInboxScanner';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // The lock screen waits for the intro video, so the biometric prompt never covers it.
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    // 1. Initialize native notification channels & EMI reminders
    notificationService.init().then(() => {
      return notificationService.reconcileEmiReminders();
    }).catch((err) => {
      console.warn('[NotificationService] Init error:', err);
    });

    // 2. Initialize APK background & foreground SMS receiver listener
    smsBackgroundReceiver.init();

    // 3. Catch up on bank SMS that arrived while the app could not process them
    //    (now, and every time the app returns to the foreground).
    return smsInboxScanner.startAutoScan();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LockProvider deferPrompt={!splashDone}>
        <AppTabs />
      </LockProvider>
      {!splashDone ? <VideoSplashOverlay onFinish={handleSplashFinish} /> : null}
    </ThemeProvider>
  );
}
