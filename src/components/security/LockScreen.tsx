import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BiometricKind, lockService } from '@/services/lock';
import { BiometricGlyph } from './BiometricGlyph';
import { PinPad } from './PinPad';

export type LockMode = 'unlock' | 'confirm' | 'setup';

interface LockScreenProps {
  mode: LockMode;
  /** Why the user is being asked (shown under the title in confirm mode). */
  reason?: string;
  biometricKind: BiometricKind;
  hapticsEnabled: boolean;
  /** Setup and confirm can be dismissed; unlock cannot. */
  cancelable: boolean;
  unlockProgress?: SharedValue<number>;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function LockScreen({
  mode,
  reason,
  biometricKind,
  hapticsEnabled,
  cancelable,
  unlockProgress,
  onSuccess,
  onCancel,
}: LockScreenProps) {
  const insets = useSafeAreaInsets();
  const hasBiometric = biometricKind !== 'none' && mode !== 'setup';

  const [view, setView] = useState<'bio' | 'pin'>(hasBiometric ? 'bio' : 'pin');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const finished = useRef(false);

  // Animation values for clean Apple / Tesla Minimalist Transition
  const success = useSharedValue(0);
  const error = useSharedValue(0);
  const shake = useSharedValue(0);
  const check = useSharedValue(0);
  const containerOpacity = useSharedValue(0);
  const containerScale = useSharedValue(1);

  const haptic = useCallback(
    (kind: 'tap' | 'success' | 'error') => {
      if (!hapticsEnabled || Platform.OS === 'web') return;
      if (kind === 'tap') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      else
        Haptics.notificationAsync(
          kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
        ).catch(() => {});
    },
    [hapticsEnabled]
  );

  // Fade in on screen appearance
  useEffect(() => {
    containerOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) });
  }, [containerOpacity]);

  const fail = useCallback(
    (text: string) => {
      haptic('error');
      setMessage(text);
      error.value = withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 380 }));
      shake.value = withSequence(
        withTiming(-12, { duration: 40 }),
        withTiming(12, { duration: 60 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-3, { duration: 40 }),
        withTiming(0, { duration: 40 })
      );
    },
    [haptic, error, shake]
  );

  /**
   * Minimalist Professional Unlock Transition:
   * 1. Gentle Green Checkmark Spring (120ms)
   * 2. Smooth Alpha Dissolve & Lift (240ms) - Zero center lines, zero splitting panels!
   * 3. Instant Native Responsiveness in 260ms (Was 820ms!)
   */
  const succeed = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    haptic('success');
    setUnlocked(true);
    setMessage(null);

    // 1. Success badge checkmark spring
    success.value = withTiming(1, { duration: 180 });
    check.value = withSpring(1, { damping: 14, stiffness: 220 });

    // 2. Coordinate with LockProvider dashboard reveal
    if (unlockProgress) {
      unlockProgress.value = withTiming(1, {
        duration: 240,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });
    }

    // 3. Smooth Alpha Dissolve & subtle scale lift
    containerOpacity.value = withTiming(0, {
      duration: 240,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    containerScale.value = withTiming(1.02, {
      duration: 240,
      easing: Easing.out(Easing.quad),
    });

    // 4. Complete transition in 260ms
    setTimeout(onSuccess, 260);
  }, [haptic, success, check, unlockProgress, containerOpacity, containerScale, onSuccess]);

  const tryBiometric = useCallback(async () => {
    if (!hasBiometric || busy || finished.current) return;
    setBusy(true);
    setMessage(null);
    const ok = await lockService.authenticateBiometric(
      mode === 'confirm' ? reason ?? 'Confirm it’s you' : 'Unlock KasuPilot'
    );
    setBusy(false);
    if (ok) succeed();
    else fail('Not recognised. Try again or use your PIN.');
  }, [hasBiometric, busy, mode, reason, succeed, fail]);

  // Prompt automatically once the screen mounts
  useEffect(() => {
    if (!hasBiometric) return;
    const timer = setTimeout(() => {
      tryBiometric();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePinChange = useCallback(
    async (next: string) => {
      setPin(next);
      if (next.length < lockService.PIN_LENGTH) return;

      if (mode === 'setup') {
        if (firstPin === null) {
          setFirstPin(next);
          setPin('');
          setMessage(null);
          return;
        }
        if (next !== firstPin) {
          setFirstPin(null);
          setPin('');
          fail('PINs did not match. Start again.');
          return;
        }
        setBusy(true);
        try {
          await lockService.setPin(next);
          succeed();
        } catch {
          setPin('');
          fail('Could not save the PIN. Try again.');
        } finally {
          setBusy(false);
        }
        return;
      }

      setBusy(true);
      const result = await lockService.verifyPin(next);
      setBusy(false);
      if (result.ok) {
        succeed();
        return;
      }
      setPin('');
      if (result.lockedForMs > 0) {
        fail(`Too many attempts. Try again in ${Math.ceil(result.lockedForMs / 1000)} s.`);
      } else {
        fail(`Wrong PIN · ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left`);
      }
    },
    [mode, firstPin, fail, succeed]
  );

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
    transform: [{ scale: containerScale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: check.value,
    transform: [{ scale: 0.4 + check.value * 0.6 }],
  }));

  const title =
    mode === 'setup'
      ? firstPin === null
        ? 'Create a 4-digit PIN'
        : 'Enter the PIN again'
      : mode === 'confirm'
      ? 'Confirm it’s you'
      : 'KasuPilot is locked';

  const subtitle =
    mode === 'setup'
      ? 'Used when fingerprint or face unlock is unavailable'
      : mode === 'confirm'
      ? reason
      : view === 'bio'
      ? biometricKind === 'face'
        ? 'Look at your phone to unlock'
        : 'Touch the fingerprint sensor to unlock'
      : 'Enter your PIN';

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.unifiedCanvas, containerAnimatedStyle]}
      accessibilityViewIsModal
      pointerEvents={unlocked ? 'none' : 'auto'}>
      {/* Clean Unified Minimalist Dark Background (Zero Center Seam / Zero Lines) */}
      <LinearGradient
        colors={['#07090E', '#0B1019', '#07090E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 36,
            paddingBottom: insets.bottom + 24,
          },
        ]}>
        {/* Header: App Brand + Title */}
        <View style={styles.header}>
          <View style={styles.appIconContainer}>
            <View style={styles.appIconHalo}>
              <Image
                source={require('@/assets/images/KPLogooo.png')}
                style={styles.appIconImage}
                contentFit="cover"
              />
            </View>
          </View>
          <Text style={styles.appNameText}>K A S U P I L O T</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {/* Biometric or PIN View */}
        {view === 'bio' ? (
          <Pressable
            onPress={tryBiometric}
            disabled={busy}
            accessibilityLabel="Try biometric unlock again">
            <BiometricGlyph
              kind={biometricKind}
              success={success}
              error={error}
              scanning={!unlocked}
            />
            <Animated.View style={[styles.checkBadge, checkStyle]} pointerEvents="none">
              <Text style={styles.checkText}>✓</Text>
            </Animated.View>
          </Pressable>
        ) : (
          <View>
            <PinPad
              value={pin}
              length={lockService.PIN_LENGTH}
              onChange={handlePinChange}
              shake={shake}
              disabled={busy || unlocked}
              onBiometric={hasBiometric ? () => setView('bio') : undefined}
              biometricLabel={biometricKind === 'face' ? '☺' : '☝'}
              onKeyPress={() => haptic('tap')}
            />
            <Animated.View
              style={[styles.checkBadge, styles.checkBadgePin, checkStyle]}
              pointerEvents="none">
              <Text style={styles.checkText}>✓</Text>
            </Animated.View>
          </View>
        )}

        {/* Footer: Messages & Action Links */}
        <View style={styles.footer}>
          <Text style={[styles.message, unlocked && styles.messageSuccess]}>
            {unlocked ? (mode === 'setup' ? 'PIN saved' : 'Unlocked') : message ?? ' '}
          </Text>
          <View style={styles.footerRow}>
            {view === 'bio' ? (
              <Pressable onPress={() => setView('pin')} style={styles.linkBtn} hitSlop={8}>
                <Text style={styles.linkText}>Use PIN</Text>
              </Pressable>
            ) : null}
            {cancelable && onCancel ? (
              <Pressable
                onPress={onCancel}
                style={styles.linkBtn}
                hitSlop={8}
                disabled={unlocked}>
                <Text style={[styles.linkText, styles.cancelText]}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  unifiedCanvas: {
    backgroundColor: '#07090E',
    zIndex: 9999,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  appIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  appIconHalo: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: '#0D111A',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  appIconImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  appNameText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8A96AD',
    fontSize: 13.5,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 18,
  },
  checkBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E676',
    shadowOpacity: 0.85,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  checkBadgePin: {
    top: -6,
    marginTop: 0,
  },
  checkText: {
    color: '#07090E',
    fontSize: 28,
    fontWeight: '900',
  },
  footer: {
    alignItems: 'center',
    gap: 14,
  },
  message: {
    color: '#FF6B61',
    fontSize: 14,
    textAlign: 'center',
    minHeight: 20,
  },
  messageSuccess: {
    color: '#00E676',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 28,
  },
  linkBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  linkText: {
    color: '#00F0FF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelText: {
    color: '#8A96AD',
  },
});
