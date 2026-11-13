import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export interface TeslaHudModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: string;
  accentColor?: string;
  buttonText?: string;
  onClose: () => void;
}

export function TeslaHudModal({
  visible,
  title,
  subtitle,
  icon = '⚡',
  badge = 'TELEMETRY NOTIFICATION',
  accentColor = '#00F0FF',
  buttonText = 'ACKNOWLEDGE // CLOSE',
  onClose,
}: TeslaHudModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[styles.cockpitCard, { borderColor: accentColor }]}>
          {/* Top Status Bar */}
          <View style={styles.headerBar}>
            <View style={styles.badgePill}>
              <View style={[styles.statusDot, { backgroundColor: accentColor }]} />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeHit} hitSlop={10}>
              <Text style={styles.closeX}>✕</Text>
            </Pressable>
          </View>

          {/* Central Hero Glyph */}
          <View style={styles.heroSection}>
            <View
              style={[
                styles.iconAura,
                {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}18`,
                  shadowColor: accentColor,
                },
              ]}>
              <Text style={styles.iconGlyph}>{icon}</Text>
            </View>

            <Text style={styles.titleText}>{title}</Text>
            {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
          </View>

          {/* Security / System Footer Seal */}
          <View style={styles.securitySeal}>
            <Text style={styles.securityText}>
              🔒 KASUPILOT SECURE RUNTIME • ZERO CLOUD SYNC
            </Text>
          </View>

          {/* Tesla Action Command Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: accentColor },
              pressed && styles.actionButtonPressed,
            ]}>
            <Text
              style={[
                styles.actionButtonText,
                { color: accentColor === '#FFFFFF' ? '#07090E' : '#07090E' },
              ]}>
              {buttonText}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  cockpitCard: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: '#0D111A',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 20,
    gap: 16,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.8,
  },
  closeHit: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: 12,
    color: '#8E9BB0',
    fontWeight: '700',
  },
  heroSection: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  iconAura: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  iconGlyph: {
    fontSize: 30,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitleText: {
    fontSize: 13,
    color: '#8E9BB0',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  securitySeal: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  securityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  actionButton: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  actionButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
