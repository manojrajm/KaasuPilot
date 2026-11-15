import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';

interface HomeTopBarProps {
  onPressMenu?: () => void;
  onPressAnalytics?: () => void;
  onPressLock?: () => void;
  onPressSettings?: () => void;
}

export function HomeTopBar({
  onPressMenu,
  onPressAnalytics,
  onPressLock,
  onPressSettings,
}: HomeTopBarProps) {
  return (
    <View style={styles.container}>
      {/* Left Brand: Enlarged App Icon + App Name */}
      <Pressable
        onPress={onPressMenu || onPressSettings}
        hitSlop={6}
        style={({ pressed }) => [styles.leftBrand, pressed && styles.brandPressed]}>
        <Image
          source={require('@/assets/images/KPLogooo.png')}
          style={styles.logoBadge}
          contentFit="cover"
        />
        <Text style={styles.brandTitle}>KasuPilot</Text>
      </Pressable>

      {/* Right Actions: Analytics, Lock & Settings */}
      <View style={styles.rightActionsRow}>
        {onPressAnalytics ? (
          <Pressable onPress={onPressAnalytics} hitSlop={8} style={styles.iconButton}>
            <Text style={styles.actionIconText}>📊</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={onPressLock} hitSlop={8} style={styles.iconButton}>
          <Text style={styles.actionIconText}>🔒</Text>
        </Pressable>

        <Pressable onPress={onPressSettings} hitSlop={8} style={styles.iconButton}>
          <Text style={styles.actionIconText}>⚙</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  leftBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0F131C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 14,
  },
});
