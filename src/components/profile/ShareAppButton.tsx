import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ShareAppButtonProps {
  onPress: () => void;
  versionLabel?: string;
}

export function ShareAppButton({
  onPress,
  versionLabel = 'v2.5.1 APK',
}: ShareAppButtonProps) {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}>
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🚀</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>Share KasuPilot</Text>
          <Text style={styles.versionText}>• {versionLabel}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.shareActionText}>Share</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    backgroundColor: '#0E131E',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  containerPressed: {
    backgroundColor: '#141A28',
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 14,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  versionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8A96AD',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shareActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.3,
  },
  chevron: {
    fontSize: 17,
    fontWeight: '600',
    color: '#00F0FF',
  },
});
