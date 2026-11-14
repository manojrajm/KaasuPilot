import React, { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { notificationService } from '@/services/notificationService';

interface NotificationSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationSettingsModal({
  visible,
  onClose,
}: NotificationSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastActionResult, setLastActionResult] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      notificationService.hasPermission().then(setHasPermission);
      setLastActionResult(null);
    }
  }, [visible]);

  const handleRequestPermission = async () => {
    setIsProcessing(true);
    const granted = await notificationService.requestPermission();
    setHasPermission(granted);
    setIsProcessing(false);
    if (granted) {
      Alert.alert('Permission Granted', 'Native notification telemetry is now active!');
    } else {
      Alert.alert('Permission Denied', 'Please enable notifications in your phone Settings to receive EMI reminders.');
    }
  };

  const handleSendTest = async () => {
    setIsProcessing(true);
    const sent = await notificationService.sendTestNotification();
    setIsProcessing(false);
    if (sent) {
      setHasPermission(true);
      setLastActionResult('✓ Test notification delivered to your system notification tray.');
    } else {
      Alert.alert('Permission Needed', 'Notifications are disabled. Please allow notification permission first.');
    }
  };

  const handleReArm = async () => {
    setIsProcessing(true);
    const res = await notificationService.reconcileEmiReminders();
    setIsProcessing(false);
    if (res.activeLoans === 0) {
      setLastActionResult('No active loans currently found in ledger. Add a loan in Loans tab to arm reminders.');
    } else {
      setLastActionResult(`✓ Successfully scheduled ${res.scheduledCount} automated reminder alarms across ${res.activeLoans} active loans.`);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Top Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.badgeIcon}>🔔</Text>
                <Text style={styles.badgeText}>HARDWARE NOTIFICATION TELEMETRY</Text>
              </View>
              <Text style={styles.title}>Native Push Reminders</Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(96, insets.bottom + 48) },
            ]}>
            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <View style={[styles.statusDot, { backgroundColor: hasPermission ? '#00E676' : '#FFB800' }]} />
                  <Text style={styles.statusTitle}>
                    {hasPermission ? 'NOTIFICATIONS ARMED' : 'PERMISSION REQUIRED'}
                  </Text>
                </View>
                <Text style={[styles.statusBadge, { color: hasPermission ? '#00E676' : '#FFB800' }]}>
                  {hasPermission ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>

              <Text style={styles.statusSub}>
                {hasPermission
                  ? 'Local on-device alarms are scheduled for all your upcoming EMI deadlines with zero internet tracking.'
                  : 'KasuPilot needs permission to trigger local reminder alarms before EMI due dates.'}
              </Text>

              {!hasPermission ? (
                <Pressable
                  onPress={handleRequestPermission}
                  style={styles.enableBtn}>
                  <Text style={styles.enableBtnText}>ALLOW PUSH NOTIFICATIONS</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Actions Toolbar */}
            <View style={styles.actionsContainer}>
              <Text style={styles.sectionLabel}>DIAGNOSTICS & TELEMETRY CONTROLS:</Text>

              <Pressable
                onPress={handleSendTest}
                disabled={isProcessing}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.btnPressed]}>
                <View style={styles.actionBtnLeft}>
                  <Text style={styles.actionBtnIcon}>🔔</Text>
                  <View>
                    <Text style={styles.actionBtnTitle}>SEND INSTANT TEST PUSH</Text>
                    <Text style={styles.actionBtnSub}>Verifies vibration, sound & lock-screen banner</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>

              <Pressable
                onPress={handleReArm}
                disabled={isProcessing}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.btnPressed]}>
                <View style={styles.actionBtnLeft}>
                  <Text style={styles.actionBtnIcon}>🔄</Text>
                  <View>
                    <Text style={styles.actionBtnTitle}>RE-ARM ALL EMI REMINDERS</Text>
                    <Text style={styles.actionBtnSub}>Recalculates upcoming dates & sets local alarms</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </View>

            {/* Action Output Message */}
            {lastActionResult ? (
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>{lastActionResult}</Text>
              </View>
            ) : null}

            {/* 3-Tier Reminder Protocol Explanation */}
            <View style={styles.protocolContainer}>
              <Text style={styles.sectionLabel}>AUTOMATED 3-TIER REMINDER PROTOCOL:</Text>

              <View style={styles.tierRow}>
                <View style={[styles.tierDot, { backgroundColor: '#00F0FF' }]} />
                <View style={styles.tierContent}>
                  <Text style={styles.tierTitle}>T-3 DAYS (9:00 AM) • EARLY WARNING</Text>
                  <Text style={styles.tierDesc}>
                    Alerts you 3 days in advance to ensure sufficient bank balance in your repayment account.
                  </Text>
                </View>
              </View>

              <View style={styles.tierRow}>
                <View style={[styles.tierDot, { backgroundColor: '#FFB800' }]} />
                <View style={styles.tierContent}>
                  <Text style={styles.tierTitle}>T-1 DAY (9:00 AM) • URGENT EVE NOTICE</Text>
                  <Text style={styles.tierDesc}>
                    Warns you that EMI debit occurs tomorrow, avoiding bounce charges and credit score hits.
                  </Text>
                </View>
              </View>

              <View style={styles.tierRow}>
                <View style={[styles.tierDot, { backgroundColor: '#FF3B30' }]} />
                <View style={styles.tierContent}>
                  <Text style={styles.tierTitle}>T-0 DAY (8:30 AM) • DEBIT DAY ALARM</Text>
                  <Text style={styles.tierDesc}>
                    Notifies on the morning of due date with 1-tap confirmation to record payment into ledger.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  dismissBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#0A0D14',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    height: '86%',
    maxHeight: '92%',
    flexDirection: 'column',
    overflow: 'hidden',
    paddingTop: Spacing.two,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeIcon: {
    fontSize: 11,
  },
  badgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#8A96AD',
    fontSize: 15,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 80,
    gap: Spacing.four,
  },
  statusCard: {
    backgroundColor: '#0F1420',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusSub: {
    color: '#8A96AD',
    fontSize: 11.5,
    lineHeight: 16,
  },
  enableBtn: {
    backgroundColor: '#00F0FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  enableBtnText: {
    color: '#07090E',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  actionsContainer: {
    gap: 8,
  },
  sectionLabel: {
    color: '#8A96AD',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1420',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  actionBtnIcon: {
    fontSize: 18,
  },
  actionBtnTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  actionBtnSub: {
    color: '#5A667D',
    fontSize: 11,
  },
  chevron: {
    color: '#00F0FF',
    fontSize: 18,
    fontWeight: '700',
  },
  feedbackBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderRadius: 12,
    padding: 12,
  },
  feedbackText: {
    color: '#00E676',
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '600',
  },
  protocolContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 14,
    gap: 12,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tierDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
  },
  tierContent: {
    flex: 1,
    gap: 2,
  },
  tierTitle: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  tierDesc: {
    color: '#8A96AD',
    fontSize: 11,
    lineHeight: 15,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
