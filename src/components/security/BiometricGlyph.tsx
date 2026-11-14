import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { BiometricKind } from '@/services/lock';

const IDLE = '#00F0FF';
const SUCCESS = '#00E676';
const ERROR = '#FF3B30';

interface BiometricGlyphProps {
  kind: BiometricKind;
  /** 0 = idle (cyan), 1 = success (green). */
  success: SharedValue<number>;
  /** 0 → 1 → 0 flash for a failed attempt (red). */
  error: SharedValue<number>;
  /** Animates the pulsing rings and scan line while true. */
  scanning: boolean;
  size?: number;
}

/** Colour shared by every stroke: cyan idle, green on success, flashing red on failure. */
function useStrokeColor(success: SharedValue<number>, error: SharedValue<number>) {
  return useAnimatedStyle(() => {
    const base = interpolateColor(success.value, [0, 1], [IDLE, SUCCESS]);
    return { borderColor: interpolateColor(error.value, [0, 1], [base, ERROR]) };
  });
}

function PulseRing({
  progress,
  offset,
  size,
  success,
  error,
}: {
  progress: SharedValue<number>;
  offset: number;
  size: number;
  success: SharedValue<number>;
  error: SharedValue<number>;
}) {
  const color = useStrokeColor(success, error);
  const style = useAnimatedStyle(() => {
    const p = (progress.value + offset) % 1;
    return {
      transform: [{ scale: 1 + p * 0.75 }],
      opacity: interpolate(p, [0, 0.15, 1], [0, 0.55, 0]),
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2 },
        color,
        style,
      ]}
    />
  );
}

/** Concentric open arcs that read as fingerprint ridges. */
function FingerprintRidges({
  size,
  success,
  error,
}: {
  size: number;
  success: SharedValue<number>;
  error: SharedValue<number>;
}) {
  const color = useStrokeColor(success, error);
  const ridges = [1, 0.8, 0.6, 0.42, 0.24];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {ridges.map((scale, i) => {
        const w = size * scale;
        const h = size * scale * 1.18;
        return (
          <Animated.View
            key={scale}
            style={[
              styles.ridge,
              {
                width: w,
                height: h,
                borderRadius: w / 2,
                // Opening each ridge on a different side gives the swirl of a real print.
                borderBottomColor: 'transparent',
                transform: [{ rotate: `${i % 2 === 0 ? -14 : 12}deg` }],
              },
              color,
              i % 2 === 1 ? { borderLeftColor: 'transparent' } : null,
            ]}
          />
        );
      })}
    </View>
  );
}

/** Corner brackets with a simple face, for Face ID / face unlock devices. */
function FaceFrame({
  size,
  success,
  error,
}: {
  size: number;
  success: SharedValue<number>;
  error: SharedValue<number>;
}) {
  const color = useStrokeColor(success, error);
  const corner = size * 0.28;
  const cornerStyle = { width: corner, height: corner, borderWidth: 3 };
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[styles.corner, cornerStyle, { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 14 }, color]} />
      <Animated.View style={[styles.corner, cornerStyle, { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 14 }, color]} />
      <Animated.View style={[styles.corner, cornerStyle, { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 14 }, color]} />
      <Animated.View style={[styles.corner, cornerStyle, { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 14 }, color]} />
      <Animated.View style={[styles.eye, { left: size * 0.32, top: size * 0.36 }, color]} />
      <Animated.View style={[styles.eye, { right: size * 0.32, top: size * 0.36 }, color]} />
      <Animated.View
        style={[
          styles.smile,
          { width: size * 0.34, height: size * 0.17, left: size * 0.33, top: size * 0.56, borderBottomLeftRadius: size, borderBottomRightRadius: size },
          color,
        ]}
      />
    </View>
  );
}

/**
 * Animated biometric emblem: pulsing sonar rings, a sweeping scan line and a
 * fingerprint (or face frame) that turns green on success and flashes red on failure.
 */
export function BiometricGlyph({ kind, success, error, scanning, size = 132 }: BiometricGlyphProps) {
  const pulse = useSharedValue(0);
  const scan = useSharedValue(0);

  useEffect(() => {
    if (scanning) {
      pulse.value = 0;
      pulse.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1);
      scan.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) })
        ),
        -1
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
      scan.value = withTiming(0.5, { duration: 200 });
    }
  }, [scanning, pulse, scan]);

  const glyphSize = size * 0.62;
  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scan.value, [0, 1], [-glyphSize / 2, glyphSize / 2]) }],
    opacity: scanning ? 0.9 : 0,
    backgroundColor: interpolateColor(
      error.value,
      [0, 1],
      [interpolateColor(success.value, [0, 1], [IDLE, SUCCESS]), ERROR]
    ),
  }));

  return (
    <View style={[styles.wrap, { width: size * 1.9, height: size * 1.9 }]}>
      {[0, 1 / 3, 2 / 3].map((offset) => (
        <PulseRing key={offset} progress={pulse} offset={offset} size={size} success={success} error={error} />
      ))}
      <View style={[styles.core, { width: size, height: size, borderRadius: size / 2 }]}>
        {kind === 'face' ? (
          <FaceFrame size={glyphSize} success={success} error={error} />
        ) : (
          <FingerprintRidges size={glyphSize} success={success} error={error} />
        )}
        <View style={[styles.scanClip, { width: glyphSize, height: glyphSize }]} pointerEvents="none">
          <Animated.View style={[styles.scanLine, scanStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  ridge: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  corner: {
    position: 'absolute',
  },
  eye: {
    position: 'absolute',
    width: 6,
    height: 12,
    borderRadius: 3,
    borderWidth: 3,
  },
  smile: {
    position: 'absolute',
    borderWidth: 3,
    borderTopWidth: 0,
  },
  scanClip: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    shadowColor: '#00F0FF',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
