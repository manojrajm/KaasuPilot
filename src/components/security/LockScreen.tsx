import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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

const DOOR_MS = 650;

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
  const { width } = useWindowDimensions();
  const hasBiometric = biometricKind !== 'none' && mode !== 'setup';

  const [view, setView] = useState<'bio' | 'pin'>(hasBiometric ? 'bio' : 'pin');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const finished = useRef(false);

  const success = useSharedValue(0);
  const error = useSharedValue(0);
  const shake = useSharedValue(0);
  const door = useSharedValue(0);
  const content = useSharedValue(0);
  const check = useSharedValue(0);
  const shockwave = useSharedValue(0);
  const seamGlow = useSharedValue(1);

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

  // Fade the content in when the lock screen appears.
  useEffect(() => {
    content.value = withTiming(1, { duration: 280 });
  }, [content]);

  const fail = useCallback(
    (text: string) => {
      haptic('error');
      setMessage(text);
      error.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 420 }));
      shake.value = withSequence(
        withTiming(-14, { duration: 45 }),
        withTiming(14, { duration: 70 }),
        withTiming(-10, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-4, { duration: 50 }),
        withTiming(0, { duration: 45 })
      );
    },
    [haptic, error, shake]
  );

  /** Success sequence: glyph turns green, shockwave blooms, volumetric beam bursts, then 3D vault doors swing open with depth. */
  const succeed = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    haptic('success');
    setUnlocked(true);
    setMessage(null);

    // 1. Success badges & glyphs
    success.value = withTiming(1, { duration: 240 });
    check.value = withSpring(1, { damping: 10, stiffness: 200 });

    // 2. Center shockwave bloom ring
    shockwave.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });

    // 3. Seam flare & laser burst
    seamGlow.value = withSequence(
      withTiming(2.5, { duration: 140 }),
      withTiming(0, { duration: 400 })
    );

    // 4. Content dissolve with 3D forward push
    content.value = withSequence(
      withTiming(1, { duration: 160 }),
      withTiming(0, { duration: 340, easing: Easing.out(Easing.ease) })
    );

    // 5. Coordinated Dashboard Cockpit Warp in LockProvider
    if (unlockProgress) {
      unlockProgress.value = withTiming(1, {
        duration: 720,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    }

    // 6. Hydraulic unlatch recoil -> 3D Perspective blast door swing
    door.value = withSequence(
      withTiming(-0.035, { duration: 130, easing: Easing.in(Easing.quad) }),
      withTiming(1, { duration: 680, easing: Easing.bezier(0.16, 1, 0.3, 1) })
    );

    setTimeout(onSuccess, 820);
  }, [haptic, success, check, shockwave, seamGlow, content, unlockProgress, door, onSuccess]);

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

  // Open the system prompt automatically once the screen has settled.
  useEffect(() => {
    if (!hasBiometric) return;
    const timer = setTimeout(() => {
      tryBiometric();
    }, 450);
    return () => clearTimeout(timer);
    // Only on mount: later attempts come from the user tapping the glyph.
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

  const half = width / 2;

  const leftDoor = useAnimatedStyle(() => {
    const p = Math.max(0, door.value);
    const recoil = Math.min(0, door.value);
    const angle = p * -82;
    const slideX = -p * (half * 0.35);
    const recoilPx = recoil * 18;

    return {
      transformOrigin: 'left',
      transform: [
        { perspective: 1200 },
        { translateX: slideX + recoilPx },
        { rotateY: `${angle}deg` },
      ],
      opacity: interpolate(p, [0, 0.78, 1], [1, 0.95, 0]),
    };
  });

  const rightDoor = useAnimatedStyle(() => {
    const p = Math.max(0, door.value);
    const recoil = Math.min(0, door.value);
    const angle = p * 82;
    const slideX = p * (half * 0.35);
    const recoilPx = -recoil * 18;

    return {
      transformOrigin: 'right',
      transform: [
        { perspective: 1200 },
        { translateX: slideX + recoilPx },
        { rotateY: `${angle}deg` },
      ],
      opacity: interpolate(p, [0, 0.78, 1], [1, 0.95, 0]),
    };
  });

  const bevelStyle = useAnimatedStyle(() => {
    const p = Math.max(0, door.value);
    return {
      opacity: interpolate(p, [0, 0.08, 0.65, 1], [0, 0.95, 0.75, 0]),
    };
  });

  const lightBeamStyle = useAnimatedStyle(() => {
    const p = Math.max(0, door.value);
    const beamWidth = interpolate(p, [0, 0.3, 0.75, 1], [0, 160, 260, 0]);
    const opacity = interpolate(p, [0, 0.15, 0.55, 1], [0, 0.9, 0.35, 0]);
    return {
      width: beamWidth,
      left: width / 2 - beamWidth / 2,
      opacity,
    };
  });

  const seamStyle = useAnimatedStyle(() => ({
    opacity: seamGlow.value,
  }));

  const shockwaveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shockwave.value, [0, 0.15, 0.7, 1], [0, 0.85, 0.25, 0]),
    transform: [
      { perspective: 1000 },
      { scale: interpolate(shockwave.value, [0, 1], [0.5, 3.2]) },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: content.value,
    transform: [
      { perspective: 1000 },
      { scale: interpolate(content.value, [0, 1], [1.14, 1]) },
      { translateY: interpolate(content.value, [0, 1], [-18, 0]) },
    ],
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
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      {/* Volumetric Center Cyan Light Flare emerging from between doors */}
      <Animated.View
        pointerEvents="none"
        style={[styles.volumetricLightBeam, lightBeamStyle]}>
        <LinearGradient
          colors={[
            'rgba(0, 240, 255, 0)',
            'rgba(0, 240, 255, 0.45)',
            'rgba(255, 255, 255, 0.85)',
            'rgba(0, 240, 255, 0.45)',
            'rgba(0, 240, 255, 0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Vault doors: two 3D perspective titanium panels */}
      <Animated.View style={[styles.door, styles.leftDoor, { width: half + 2 }, leftDoor]}>
        <LinearGradient
          colors={['#111622', '#080B10', '#040608']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.doorEtchLine1} />
        <View style={styles.doorEtchLine2} />
        {/* 3D Titanium Bevel Edge on the Right of Left Door */}
        <Animated.View style={[styles.leftDoorBevel, bevelStyle]}>
          <LinearGradient
            colors={['#3F506B', '#222E40', '#101622']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.bevelSpecularLine} />
        </Animated.View>
        <Animated.View style={[styles.doorSeamLeft, seamStyle]} />
      </Animated.View>

      <Animated.View style={[styles.door, styles.rightDoor, { width: half + 2 }, rightDoor]}>
        <LinearGradient
          colors={['#040608', '#080B10', '#111622']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.doorEtchLine1} />
        <View style={styles.doorEtchLine2} />
        {/* 3D Titanium Bevel Edge on the Left of Right Door */}
        <Animated.View style={[styles.rightDoorBevel, bevelStyle]}>
          <LinearGradient
            colors={['#101622', '#222E40', '#3F506B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.bevelSpecularLine} />
        </Animated.View>
        <Animated.View style={[styles.doorSeamRight, seamStyle]} />
      </Animated.View>

      {/* Cinematic Shockwave Pulse on Unlock */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shockwaveRing,
          { left: width / 2 - 120, top: '44%' },
          shockwaveStyle,
        ]}
      />

      <Animated.View
        style={[styles.content, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }, contentStyle]}
        pointerEvents={unlocked ? 'none' : 'auto'}>
        <View style={styles.header}>
          <View style={styles.appIconContainer}>
            <View style={styles.appIconHalo}>
              <Image
                source={require('@/assets/images/KPLogo.png')}
                style={styles.appIconImage}
                contentFit="contain"
              />
            </View>
          </View>
          <Text style={styles.appNameText}>K A S U P I L O T</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {view === 'bio' ? (
          <Pressable onPress={tryBiometric} disabled={busy} accessibilityLabel="Try biometric unlock again">
            <BiometricGlyph kind={biometricKind} success={success} error={error} scanning={!unlocked} />
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
            <Animated.View style={[styles.checkBadge, styles.checkBadgePin, checkStyle]} pointerEvents="none">
              <Text style={styles.checkText}>✓</Text>
            </Animated.View>
          </View>
        )}

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
              <Pressable onPress={onCancel} style={styles.linkBtn} hitSlop={8} disabled={unlocked}>
                <Text style={[styles.linkText, styles.cancelText]}>Cancel</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  door: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#07090E',
    overflow: 'visible',
  },
  leftDoor: {
    left: 0,
    zIndex: 10,
  },
  rightDoor: {
    right: 0,
    zIndex: 10,
  },
  doorSeamLeft: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  doorSeamRight: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  leftDoorBevel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 14,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.18)',
    borderRightWidth: 1.5,
    borderRightColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 5,
  },
  rightDoorBevel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.18)',
    borderLeftWidth: 1.5,
    borderLeftColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.85,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 5,
  },
  bevelSpecularLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 4,
    width: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  volumetricLightBeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 8,
  },
  doorEtchLine1: {
    position: 'absolute',
    top: '28%',
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  doorEtchLine2: {
    position: 'absolute',
    top: '72%',
    left: 16,
    right: 16,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  shockwaveRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    zIndex: 25,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 30,
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
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  appIconImage: {
    width: 54,
    height: 54,
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
    shadowOpacity: 0.9,
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
    fontSize: 30,
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
