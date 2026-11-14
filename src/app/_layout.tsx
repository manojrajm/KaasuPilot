import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useState } from 'react';
import { useColorScheme } from 'react-native';

import { VideoSplashOverlay } from '@/components/video-splash';
import AppTabs from '@/components/app-tabs';
import { LockProvider } from '@/components/security/LockProvider';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  // The lock screen waits for the intro video, so the biometric prompt never covers it.
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinish = useCallback(() => setSplashDone(true), []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LockProvider deferPrompt={!splashDone}>
        <AppTabs />
      </LockProvider>
      {!splashDone ? <VideoSplashOverlay onFinish={handleSplashFinish} /> : null}
    </ThemeProvider>
  );
}
