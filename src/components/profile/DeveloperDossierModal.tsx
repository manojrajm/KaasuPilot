import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface DeveloperProfileConfig {
  name: string;
  role: string;
  location: string;
  avatarUrl: string;
  githubProfileUrl: string;
  phone?: string;
  whatsappUrl?: string;
  email?: string;
  upiId?: string;
}

export const DEFAULT_DEVELOPER_CONFIG: DeveloperProfileConfig = {
  name: 'Manoj Raj',
  role: 'Systems Architect & Mobile Engineer',
  location: 'KasuPilot Creator • Tamil Nadu, India',
  avatarUrl: 'https://github.com/manojrajm.png',
  githubProfileUrl: 'https://github.com/manojrajm',
  phone: '+919876543210',
  whatsappUrl: 'https://wa.me/7339059057?text=Hi%20Manoj,%20I%20love%20using%20KasuPilot!',
  email: 'manojemorite@gmail.com',
  upiId: 'gauthamtamizha007-1@oksbi',
};

interface DeveloperDossierModalProps {
  visible: boolean;
  onClose: () => void;
  config?: Partial<DeveloperProfileConfig>;
}

export function DeveloperDossierModal({
  visible,
  onClose,
  config = {},
}: DeveloperDossierModalProps) {
  const insets = useSafeAreaInsets();
  const [copiedUpi, setCopiedUpi] = useState(false);

  const mergedConfig: DeveloperProfileConfig = {
    ...DEFAULT_DEVELOPER_CONFIG,
    ...config,
  };

  const handleOpenLink = async (url?: string, label?: string) => {
    if (!url) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open link', `Could not open ${label || url}`);
      }
    } catch {
      Alert.alert('Error', `Could not open ${label || url}`);
    }
  };

  const handleSponsorUpi = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const upiUrl = `upi://pay?pa=${mergedConfig.upiId}&pn=${encodeURIComponent(mergedConfig.name)}&cu=INR&mode=02&purpose=00`;
    try {
      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
      } else {
        // Fallback: Copy UPI ID
        handleCopyUpi();
      }
    } catch {
      handleCopyUpi();
    }
  };

  const handleCopyUpi = async () => {
    if (!mergedConfig.upiId) return;
    await Clipboard.setStringAsync(mergedConfig.upiId);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopiedUpi(true);
    Alert.alert(
      'UPI ID Copied',
      `${mergedConfig.upiId} copied to clipboard! You can paste it into GPay, PhonePe, or Paytm to sponsor.`,
      [{ text: 'OK', onPress: () => setTimeout(() => setCopiedUpi(false), 3000) }]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom + 20, 24) },
          ]}>
          {/* Header Drag Handle & Close */}
          <View style={styles.topHandleRow}>
            <View style={styles.dragPill} />
          </View>

          <View style={styles.header}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}> CREATOR </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}>
            {/* 1. Profile Avatar & Identity */}
            <View style={styles.profileSection}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{ uri: mergedConfig.avatarUrl }}
                  style={styles.avatarImg}
                  contentFit="cover"
                  transition={200}
                />
              </View>

              <Text style={styles.nameText}>{mergedConfig.name}</Text>
              <Text style={styles.roleText}>{mergedConfig.role}</Text>
              <Text style={styles.locationText}>{mergedConfig.location}</Text>
            </View>

            {/* 2. Connect & Collaborate Row (Single Horizontal Row) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>CONNECT & PROFILES</Text>

              <View style={styles.actionRow}>
                {/* GitHub Profile */}
                <Pressable
                  onPress={() => handleOpenLink(mergedConfig.githubProfileUrl, 'GitHub Profile')}
                  style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}>
                  <Text style={styles.actionIcon}>👨🏻‍💻</Text>
                  <Text style={styles.actionLabel}>GitHub</Text>
                </Pressable>

                {/* WhatsApp */}
                <Pressable
                  onPress={() => handleOpenLink(mergedConfig.whatsappUrl, 'WhatsApp')}
                  style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}>
                  <Text style={styles.actionIcon}>💬</Text>
                  <Text style={styles.actionLabel}>Chat</Text>
                </Pressable>

                {/* Call */}
                <Pressable
                  onPress={() => handleOpenLink(`tel:${mergedConfig.phone}`, 'Phone')}
                  style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}>
                  <Text style={styles.actionIcon}>📞</Text>
                  <Text style={styles.actionLabel}>Call</Text>
                </Pressable>

                {/* Email */}
                <Pressable
                  onPress={() => handleOpenLink(`mailto:${mergedConfig.email}`, 'Email')}
                  style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}>
                  <Text style={styles.actionIcon}>✉️</Text>
                  <Text style={styles.actionLabel}>Mail</Text>
                </Pressable>
              </View>
            </View>

            {/* 3. MNC Professional Sponsor Section */}
            <View style={styles.sponsorBlock}>
              <Text style={styles.sectionTitle}>SUPPORT INDEPENDENT ENGINEERING</Text>
              <Text style={styles.sponsorDesc}>
                KasuPilot is 100% free, private, and open-source with zero ads. Back ongoing on-device intelligence and maintenance.
              </Text>

              {/* Primary Sponsor UPI Button */}
              <Pressable
                onPress={handleSponsorUpi}
                style={({ pressed }) => [
                  styles.sponsorPrimaryBtn,
                  pressed && styles.sponsorPrimaryBtnPressed,
                ]}>
                <Text style={styles.sponsorBtnHeart}>💖</Text>
                <Text style={styles.sponsorBtnText}>Sponsor via UPI</Text>
                <Text style={styles.sponsorBtnSub}>(GPay • PhonePe • Paytm)</Text>
              </Pressable>

              {/* Copy UPI ID Row */}
              <View style={styles.upiRow}>
                <View style={styles.upiCapsule}>
                  <Text style={styles.upiLabel}>UPI ID:</Text>
                  <Text style={styles.upiIdText}>{mergedConfig.upiId}</Text>
                </View>

                <Pressable onPress={handleCopyUpi} style={styles.copyBtn}>
                  <Text style={styles.copyBtnText}>
                    {copiedUpi ? '✓ Copied' : '📋 Copy'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* 4. Tech Engine Signature */}
           
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: '#0A0E17',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '85%',
  },
  topHandleRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  headerBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 20,
  },

  // 1. Profile section
  profileSection: {
    alignItems: 'center',
    gap: 5,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
    backgroundColor: '#141A28',
    marginBottom: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  nameText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00F0FF',
  },
  locationText: {
    fontSize: 11.5,
    color: '#7E8B9F',
    fontWeight: '500',
  },

  // 2. Connect row
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionPill: {
    flex: 1,
    height: 52,
    backgroundColor: '#0F1523',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  actionPillPressed: {
    backgroundColor: '#182136',
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  actionIcon: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CFD7E6',
  },

  // 3. Sponsor section
  sponsorBlock: {
    backgroundColor: '#0F1523',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  sponsorDesc: {
    fontSize: 12,
    color: '#8E9BB0',
    lineHeight: 17,
  },
  sponsorPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00E676',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  sponsorPrimaryBtnPressed: {
    opacity: 0.85,
  },
  sponsorBtnHeart: {
    fontSize: 15,
  },
  sponsorBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#06130D',
  },
  sponsorBtnSub: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(6, 19, 13, 0.8)',
  },
  upiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  upiCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  upiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#65738E',
  },
  upiIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00F0FF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 4. Footer Note
  footerNote: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  footerNoteText: {
    fontSize: 10,
    color: '#4B5568',
    letterSpacing: 0.4,
  },
});
