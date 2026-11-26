import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const KASUPILOT_RELEASE_URL =
  'https://github.com/manojrajm/KaasuPilot/releases/tag/v2.5.1';

const SHARE_INVITE_MESSAGE =
  `🚀 Check out KasuPilot v2.5.1 — The Cyber Financial Cockpit for private expense tracking, 30-day cash velocity curves, and savings!\n\nDownload Latest APK:\n${KASUPILOT_RELEASE_URL}`;

interface ShareAppModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ShareAppModal({ visible, onClose }: ShareAppModalProps) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const triggerHaptic = (type: 'light' | 'success' = 'light') => {
    if (Platform.OS === 'web') return;
    if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(KASUPILOT_RELEASE_URL);
    triggerHaptic('success');
    setCopied(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => {
      setCopied(false);
    }, 2200);
  };

  const handleShareWhatsApp = async () => {
    triggerHaptic('light');
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(SHARE_INVITE_MESSAGE)}`;
    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await handleNativeShare();
      }
    } catch {
      await handleNativeShare();
    }
  };

  const handleNativeShare = async () => {
    triggerHaptic('light');
    try {
      await Share.share({
        title: 'KasuPilot v2.5.1 APK',
        message: SHARE_INVITE_MESSAGE,
        url: KASUPILOT_RELEASE_URL,
      });
    } catch {
      Alert.alert('Share Failed', 'Could not open system share sheet. Link copied instead.');
      await handleCopyLink();
    }
  };

  const handleOpenGitHub = async () => {
    triggerHaptic('light');
    try {
      const supported = await Linking.canOpenURL(KASUPILOT_RELEASE_URL);
      if (supported) {
        await Linking.openURL(KASUPILOT_RELEASE_URL);
      } else {
        Alert.alert('Unable to Open', 'Please copy the link and open it in your browser.');
      }
    } catch {
      Alert.alert('Error', 'Could not open GitHub release page.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}>
          {/* Drag Pill */}
          <View style={styles.dragPillWrap}>
            <View style={styles.dragPill} />
          </View>

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.appIconBadge}>
                <Text style={styles.appIconEmoji}>🚀</Text>
              </View>
              <View style={styles.titleBlock}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>SHARE KASUPILOT</Text>
                  <View style={styles.versionTag}>
                    <Text style={styles.versionTagText}>v2.5.1 APK</Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>
                  100% Local Vault • Zero Cloud Tracking
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Official Link Box */}
          <View style={styles.linkCard}>
            <Text style={styles.linkLabel}>OFFICIAL APK RELEASE LINK</Text>
            <View style={styles.linkRow}>
              <Text style={styles.linkUrl} numberOfLines={1} ellipsizeMode="middle">
                {KASUPILOT_RELEASE_URL}
              </Text>
              <Pressable
                onPress={handleCopyLink}
                style={[styles.copyBtn, copied && styles.copyBtnSuccess]}>
                <Text style={[styles.copyBtnText, copied && styles.copyBtnTextSuccess]}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Share Actions */}
          <View style={styles.actionsList}>
            <Pressable
              onPress={handleShareWhatsApp}
              style={({ pressed }) => [
                styles.actionRow,
                styles.whatsappRow,
                pressed && styles.rowPressed,
              ]}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconCircle, styles.whatsappIconBg]}>
                  <Text style={styles.actionIcon}>💬</Text>
                </View>
                <View>
                  <Text style={styles.actionTitle}>Share via WhatsApp</Text>
                  <Text style={styles.actionSub}>Send pre-filled APK invite link</Text>
                </View>
              </View>
              <Text style={[styles.actionChevron, { color: '#00E676' }]}>›</Text>
            </Pressable>

            <Pressable
              onPress={handleNativeShare}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.rowPressed,
              ]}>
              <View style={styles.actionLeft}>
                <View style={[styles.actionIconCircle, styles.nativeIconBg]}>
                  <Text style={styles.actionIcon}>📤</Text>
                </View>
                <View>
                  <Text style={styles.actionTitle}>More Share Options</Text>
                  <Text style={styles.actionSub}>Telegram, Messages, Nearby Share</Text>
                </View>
              </View>
              <Text style={[styles.actionChevron, { color: '#00F0FF' }]}>›</Text>
            </Pressable>

            <Pressable
              onPress={handleOpenGitHub}
              style={({ pressed }) => [
                styles.actionRow,
                pressed && styles.rowPressed,
              ]}>
              <View style={styles.actionLeft}>
                <View style={styles.actionIconCircle}>
                  <Text style={styles.actionIcon}>🌐</Text>
                </View>
                <View>
                  <Text style={styles.actionTitle}>Open GitHub Release</Text>
                  <Text style={styles.actionSub}>View changelog & APK assets</Text>
                </View>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </Pressable>
          </View>

          <Text style={styles.footerNote}>
            🛡️ Invite friends & colleagues to track expenses privately
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 6, 12, 0.78)',
  },
  sheet: {
    backgroundColor: '#0C111D',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1.2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.22)',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 16,
  },
  dragPillWrap: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconEmoji: {
    fontSize: 20,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  versionTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.14)',
    borderWidth: 0.8,
    borderColor: 'rgba(0, 230, 118, 0.45)',
  },
  versionTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 11,
    color: '#8A96AD',
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#8A96AD',
    fontSize: 13,
    fontWeight: '700',
  },
  linkCard: {
    backgroundColor: '#070A12',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    gap: 7,
  },
  linkLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkUrl: {
    flex: 1,
    fontSize: 12,
    color: '#C9D3E6',
    fontWeight: '600',
  },
  copyBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
  },
  copyBtnSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.16)',
    borderColor: '#00E676',
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00F0FF',
  },
  copyBtnTextSuccess: {
    color: '#00E676',
  },
  actionsList: {
    gap: 9,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  whatsappRow: {
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  rowPressed: {
    backgroundColor: '#182135',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappIconBg: {
    backgroundColor: 'rgba(0, 230, 118, 0.14)',
  },
  nativeIconBg: {
    backgroundColor: 'rgba(0, 240, 255, 0.14)',
  },
  actionIcon: {
    fontSize: 16,
  },
  actionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionSub: {
    fontSize: 11,
    color: '#8A96AD',
    fontWeight: '500',
  },
  actionChevron: {
    fontSize: 18,
    fontWeight: '700',
    color: '#65738E',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 10.5,
    color: '#65738E',
    fontWeight: '600',
  },
});
