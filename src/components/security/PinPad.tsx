import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

interface PinPadProps {
  value: string;
  length: number;
  onChange: (next: string) => void;
  /** Horizontal shake offset applied to the dots after a wrong PIN. */
  shake: SharedValue<number>;
  disabled?: boolean;
  /** Shown in the bottom-left key when biometrics are available. */
  onBiometric?: () => void;
  biometricLabel?: string;
  onKeyPress?: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'del'] as const;

export function PinPad({
  value,
  length,
  onChange,
  shake,
  disabled,
  onBiometric,
  biometricLabel = '☝',
  onKeyPress,
}: PinPadProps) {
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled) return;
    onKeyPress?.();
    if (key === 'del') {
      onChange(value.slice(0, -1));
    } else if (key === 'bio') {
      onBiometric?.();
    } else if (value.length < length) {
      onChange(value + key);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dotsRow, shakeStyle]}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < value.length && styles.dotFilled]} />
        ))}
      </Animated.View>

      <View style={styles.grid}>
        {KEYS.map((key) => {
          if (key === 'bio' && !onBiometric) return <View key={key} style={styles.key} />;
          const label = key === 'del' ? '⌫' : key === 'bio' ? biometricLabel : key;
          return (
            <Pressable
              key={key}
              onPress={() => press(key)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={key === 'del' ? 'Delete' : key === 'bio' ? 'Use biometrics' : key}
              style={({ pressed }) => [
                styles.key,
                key !== 'bio' && key !== 'del' && styles.digitKey,
                pressed && styles.keyPressed,
                disabled && styles.keyDisabled,
              ]}>
              <Text style={[styles.keyText, (key === 'bio' || key === 'del') && styles.actionKeyText]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 26,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 18,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.6)',
  },
  dotFilled: {
    backgroundColor: '#00F0FF',
    borderColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  grid: {
    width: 264,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitKey: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  keyPressed: {
    backgroundColor: 'rgba(0, 240, 255, 0.18)',
    borderColor: 'rgba(0, 240, 255, 0.5)',
  },
  keyDisabled: {
    opacity: 0.35,
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
  actionKeyText: {
    fontSize: 24,
    color: '#00F0FF',
  },
});
