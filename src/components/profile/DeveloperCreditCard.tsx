import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface DeveloperCreditCardProps {
  onPress: () => void;
  developerName?: string;
  role?: string;
}

export function DeveloperCreditCard({
  onPress,
  developerName = 'Manoj Raj',
  role = 'Lead Architect',
}: DeveloperCreditCardProps) {
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
          <Text style={styles.iconText}>👨‍💻</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.nameText}>{developerName}</Text>
          <Text style={styles.roleText}>• {role}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.viewProfileText}>View Profile</Text>
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    borderColor: 'rgba(0, 240, 255, 0.3)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 15,
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewProfileText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00F0FF',
  },
  chevron: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00F0FF',
    marginTop: -1,
  },
});
