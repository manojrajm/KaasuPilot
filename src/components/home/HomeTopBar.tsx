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
      {/* Left Menu / Drawer Icon */}
      <Pressable onPress={onPressMenu} hitSlop={10} style={styles.iconButton}>
        <Text style={styles.menuIconText}>☰</Text>
      </Pressable>

      {/* Brand & Telemetry Status in Center */}
      <View style={styles.brandContainer}>
        <View style={styles.logoRow}>
          <Image
            source={require('@/assets/images/KPLogo.png')}
            style={styles.logoBadge}
            contentFit="cover"
          />
          <Text style={styles.brandTitle}>KasuPilot</Text>
        </View>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusPillText}>LOCAL-FIRST VAULT • ENCRYPTED</Text>
        </View>
      </View>

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
  menuIconText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  brandContainer: {
    alignItems: 'center',
    gap: 3,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
  statusPillText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  rightActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconText: {
    fontSize: 14,
  },
});
