import * as ScreenCapture from 'expo-screen-capture';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { settingsRepo } from '@/data/repositories/settingsRepo';
import { DEFAULT_SECURITY, SecuritySettings } from '@/domain/profile/types';
import { BiometricKind, lockService } from '@/services/lock';
import { LockMode, LockScreen } from './LockScreen';

interface LockContextValue {
  /** Asks for biometrics/PIN (creating a PIN first if none exists). Resolves true on success. */
  confirmIdentity: (reason: string) => Promise<boolean>;
  /** Shows PIN creation. Resolves true once a PIN is saved. */
  setupPin: () => Promise<boolean>;
  /** Locks the app immediately. */
  lockNow: () => void;
}

const LockContext = createContext<LockContextValue | null>(null);

export function useAppLock(): LockContextValue {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useAppLock must be used inside <LockProvider>');
  return ctx;
}

const AUTO_LOCK_MS: Record<SecuritySettings['autoLockDuration'], number> = {
  immediate: 0,
  '1m': 60_000,
  '5m': 300_000,
};

interface Prompt {
  mode: LockMode;
  reason?: string;
  cancelable: boolean;
  resolve?: (ok: boolean) => void;
  /** Bumped per prompt so a new lock screen mounts with fresh state. */
  key: number;
}

/**
 * App lock gate. The app renders underneath at all times (so navigation and data are kept);
 * an opaque lock screen covers it whenever it is locked or asking for confirmation.
 */
export function LockProvider({
  children,
  deferPrompt = false,
}: {
  children: React.ReactNode;
  /** While true the app stays covered but the lock screen (and its biometric prompt) waits. */
  deferPrompt?: boolean;
}) {
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [biometricKind, setBiometricKind] = useState<BiometricKind>('none');
  const [ready, setReady] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const backgroundedAt = useRef<number | null>(null);
  const promptCounter = useRef(0);
  const securityRef = useRef(security);
  securityRef.current = security;

  const unlockProgress = useSharedValue(1);

  useEffect(() => {
    if (prompt && !deferPrompt) {
      unlockProgress.value = 0;
    }
  }, [prompt, deferPrompt, unlockProgress]);

  const dashboard3DStyle = useAnimatedStyle(() => {
    if (!prompt) {
      return { flex: 1 };
    }
    const p = unlockProgress.value;
    return {
      flex: 1,
      transform: [
        { perspective: 1200 },
        { scale: interpolate(p, [0, 1], [0.90, 1.0]) },
        { translateY: interpolate(p, [0, 1], [24, 0]) },
      ],
      opacity: interpolate(p, [0, 0.25, 1], [0.35, 0.65, 1.0]),
    };
  });

  const openPrompt = useCallback((p: Omit<Prompt, 'key'>) => {
    promptCounter.current += 1;
    setPrompt({ ...p, key: promptCounter.current });
  }, []);

  // Initial state: lock (or ask to create a PIN) before showing any data.
  useEffect(() => {
    let active = true;
    Promise.all([
      settingsRepo.get('security'),
      settingsRepo.get('experience'),
      lockService.hasPin(),
      lockService.biometricKind(),
    ])
      .then(([sec, exp, hasPin, kind]) => {
        if (!active) return;
        setSecurity(sec);
        setHapticsEnabled(exp.hapticsEnabled);
        setBiometricKind(kind);
        if (sec.biometricLockEnabled) {
          openPrompt(hasPin ? { mode: 'unlock', cancelable: false } : { mode: 'setup', cancelable: false });
        }
      })
      .catch((error) => console.error('Failed to initialise app lock', error))
      .finally(() => {
        if (active) setReady(true);
      });

    const unsubscribe = settingsRepo.subscribe(() => {
      Promise.all([settingsRepo.get('security'), settingsRepo.get('experience')])
        .then(([sec, exp]) => {
          if (!active) return;
          setSecurity(sec);
          setHapticsEnabled(exp.hapticsEnabled);
        })
        .catch(() => {});
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [openPrompt]);

  // Re-lock after the chosen time in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        if (!lockService.isAutoLockSuspended()) backgroundedAt.current = Date.now();
        return;
      }
      if (state !== 'active') return;
      const since = backgroundedAt.current;
      backgroundedAt.current = null;
      // Re-check enrolment: the user may have added a fingerprint while away.
      lockService.biometricKind().then(setBiometricKind).catch(() => {});
      const sec = securityRef.current;
      if (since === null || !sec.biometricLockEnabled || lockService.isAutoLockSuspended()) return;
      if (Date.now() - since < AUTO_LOCK_MS[sec.autoLockDuration]) return;
      lockService.hasPin().then((hasPin) => {
        if (!hasPin) return;
        setPrompt((current) => {
          // Never replace an open confirmation or PIN setup.
          if (current) return current;
          promptCounter.current += 1;
          return { mode: 'unlock', cancelable: false, key: promptCounter.current };
        });
      });
    });
    return () => sub.remove();
  }, []);

  // Privacy shield: block screenshots and blank the recent-apps preview.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const apply = async () => {
      try {
        if (security.privacyCurtainEnabled) {
          await ScreenCapture.preventScreenCaptureAsync('privacy-shield');
          if (Platform.OS === 'ios') await ScreenCapture.enableAppSwitcherProtectionAsync(0.8);
        } else {
          await ScreenCapture.allowScreenCaptureAsync('privacy-shield');
          if (Platform.OS === 'ios') await ScreenCapture.disableAppSwitcherProtectionAsync();
        }
      } catch (error) {
        console.warn('Screen capture protection unavailable', error);
      }
    };
    apply();
  }, [security.privacyCurtainEnabled]);

  const confirmIdentity = useCallback(
    async (reason: string) => {
      const hasPin = await lockService.hasPin();
      return new Promise<boolean>((resolve) => {
        openPrompt(
          hasPin
            ? { mode: 'confirm', reason, cancelable: true, resolve }
            : { mode: 'setup', reason, cancelable: true, resolve }
        );
      });
    },
    [openPrompt]
  );

  const setupPin = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        openPrompt({ mode: 'setup', cancelable: true, resolve });
      }),
    [openPrompt]
  );

  const lockNow = useCallback(() => {
    lockService.hasPin().then((hasPin) => {
      if (hasPin) openPrompt({ mode: 'unlock', cancelable: false });
    });
  }, [openPrompt]);

  const finish = useCallback((ok: boolean) => {
    setPrompt((current) => {
      current?.resolve?.(ok);
      return null;
    });
    if (!ok) {
      unlockProgress.value = 0;
    }
  }, [unlockProgress]);

  const value = useMemo(() => ({ confirmIdentity, setupPin, lockNow }), [confirmIdentity, setupPin, lockNow]);

  return (
    <LockContext.Provider value={value}>
      <Animated.View style={dashboard3DStyle}>
        {children}
      </Animated.View>
      {/* Until settings load, cover the app so nothing flashes before the lock decides. */}
      {!ready || (prompt && deferPrompt) ? <View style={[styles.cover, styles.opaque]} /> : null}
      {prompt && !deferPrompt ? (
        <View style={styles.cover}>
          <LockScreen
            key={prompt.key}
            mode={prompt.mode}
            reason={prompt.reason}
            biometricKind={biometricKind}
            hapticsEnabled={hapticsEnabled}
            cancelable={prompt.cancelable}
            unlockProgress={unlockProgress}
            onSuccess={() => finish(true)}
            onCancel={() => finish(false)}
          />
        </View>
      ) : null}
    </LockContext.Provider>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  opaque: {
    backgroundColor: '#07090E',
  },
});
