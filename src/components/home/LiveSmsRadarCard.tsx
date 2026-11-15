import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Transaction, Account } from '@/domain/types';
import { formatPaise } from '@/domain/money/format';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/data/seed/defaultCategories';
import { smsIngestionService } from '@/services/smsIngestion';

interface LiveSmsRadarCardProps {
  pendingTransactions: Transaction[];
  accountsById: Record<string, Account>;
  accounts?: Account[];
  onConfirm: (txId: string) => Promise<void>;
  onDismiss: (txId: string) => Promise<void>;
  onOpenEditModal?: (tx: Transaction) => void;
  onOpenFullInbox?: () => void;
}

export function LiveSmsRadarCard({
  pendingTransactions,
  accountsById,
  accounts = [],
  onConfirm,
  onDismiss,
  onOpenEditModal,
  onOpenFullInbox,
}: LiveSmsRadarCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Keep index within bounds if transactions change
  useEffect(() => {
    if (currentIndex >= pendingTransactions.length && pendingTransactions.length > 0) {
      setCurrentIndex(pendingTransactions.length - 1);
    }
  }, [pendingTransactions.length, currentIndex]);

  const count = pendingTransactions.length;

  const handleSimulate = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const samples = smsIngestionService.getSampleSms(accounts);
      if (samples.length > 0) {
        await smsIngestionService.ingestSms(samples[0]);
      }
    } catch (err) {
      console.warn('Simulation trigger error:', err);
    }
  };

  // -------------------------------------------------------------
  // IDLE / ALL CAUGHT UP STATE: Sleek Air-Gapped Radar Status Pill
  // -------------------------------------------------------------
  if (count === 0) {
    return (
      <Pressable onPress={onOpenFullInbox} style={styles.idleContainer}>
        <View style={styles.idleLeft}>
          <View style={styles.idleRadarPing}>
            <View style={styles.idleRadarDot} />
          </View>
          <View style={styles.idleMeta}>
            <View style={styles.idleBadgeRow}>
              <Text style={styles.idleBadgeIcon}>🛡️</Text>
              <Text style={styles.idleBadgeText}>AIR-GAPPED SMS RADAR</Text>
            </View>
            <Text style={styles.idleSubtitle}>
              Listening for bank alerts • 0 pending
            </Text>
          </View>
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleSimulate();
          }}
          style={styles.simulatePill}>
          <Text style={styles.simulatePillText}>＋ Simulate</Text>
        </Pressable>
      </Pressable>
    );
  }

  // -------------------------------------------------------------
  // ACTIVE RADAR: Prominent Pro Cyber Cockpit Card
  // -------------------------------------------------------------
  const activeTx = pendingTransactions[currentIndex] || pendingTransactions[0];
  const isCredit = activeTx.direction === 'credit';
  const account = accountsById[activeTx.accountId];

  // Resolve category emoji & color
  const allCategories = isCredit ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const categoryMeta = allCategories.find((c) => c.id === activeTx.categoryId);
  const categoryEmoji = categoryMeta?.emoji || (isCredit ? '💰' : '💳');
  const categoryName = categoryMeta?.name || 'Transaction';

  // Check if unmatched bank note exists
  const isUnmatched = activeTx.note?.includes('[UNMATCHED:');

  const handleNext = () => {
    if (currentIndex < count - 1) {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handle1TapConfirm = async () => {
    try {
      setConfirmingId(activeTx.id);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      await onConfirm(activeTx.id);
    } catch (err) {
      console.warn('Confirm error:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDismiss = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await onDismiss(activeTx.id);
    } catch (err) {
      console.warn('Dismiss error:', err);
    }
  };

  return (
    <View style={styles.radarCard}>
      {/* 1. Header Bar: Pulsing Radar Dot + Title + Paging Controls */}
      <View style={styles.radarHeader}>
        <View style={styles.radarHeaderLeft}>
          <View style={styles.liveRadarPing}>
            <View style={styles.liveRadarDot} />
          </View>
          <Text style={styles.radarTitle}>LIVE BANK RADAR</Text>
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>
              {count > 1 ? `${currentIndex + 1} of ${count}` : '1 PENDING'}
            </Text>
          </View>
        </View>

        <View style={styles.radarHeaderRight}>
          {count > 1 ? (
            <View style={styles.stepperContainer}>
              <Pressable
                onPress={handlePrev}
                disabled={currentIndex === 0}
                style={[styles.stepBtn, currentIndex === 0 && styles.stepBtnDisabled]}>
                <Text style={styles.stepBtnText}>◀</Text>
              </Pressable>
              <Pressable
                onPress={handleNext}
                disabled={currentIndex === count - 1}
                style={[styles.stepBtn, currentIndex === count - 1 && styles.stepBtnDisabled]}>
                <Text style={styles.stepBtnText}>▶</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={onOpenFullInbox} style={styles.inboxLink}>
            <Text style={styles.inboxLinkText}>Inbox ›</Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Account & Timestamp Capsule */}
      <View style={styles.metaRow}>
        <View style={[styles.accountPill, isUnmatched && styles.unmatchedPill]}>
          <Text style={styles.accountPillText}>
            {isUnmatched ? '⚠️ UNMATCHED CARD' : `${account?.type === 'cash' ? '💵' : '🏦'} ${account?.name ?? 'Bank Account'}${account?.lastFourDigits ? ` ••${account.lastFourDigits}` : ''}`}
          </Text>
        </View>
        <Text style={styles.timeText}>Just Now</Text>
      </View>

      {/* 3. Merchant & Amount Hero Row */}
      <View style={styles.heroRow}>
        <View style={styles.merchantSection}>
          <View style={styles.categoryIconWrap}>
            <Text style={styles.categoryEmoji}>{categoryEmoji}</Text>
          </View>
          <View style={styles.merchantMeta}>
            <Text style={styles.merchantName} numberOfLines={1}>
              {activeTx.merchant || 'Bank Transaction'}
            </Text>
            <Text style={styles.categorySub}>{categoryName}</Text>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text
            style={[
              styles.amountText,
              isCredit ? styles.amountCredit : styles.amountDebit,
            ]}>
            {isCredit ? '+ ' : '- '}
            {formatPaise(activeTx.amountPaise)}
          </Text>
        </View>
      </View>

      {/* 4. Raw SMS Snippet Capsule */}
      {activeTx.note ? (
        <View style={styles.smsSnippetCapsule}>
          <Text style={styles.smsSnippetText} numberOfLines={2}>
            {activeTx.note.replace(/^\[UNMATCHED:[^\]]+\]\s*/, '')}
          </Text>
        </View>
      ) : null}

      {/* 5. Action Buttons Dock */}
      <View style={styles.actionDock}>
        <Pressable onPress={handleDismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissBtnText}>✕ Dismiss</Text>
        </Pressable>

        <Pressable
          onPress={() => onOpenEditModal?.(activeTx) ?? onOpenFullInbox?.()}
          style={styles.editBtn}>
          <Text style={styles.editBtnText}>✏️ Edit</Text>
        </Pressable>

        <Pressable
          onPress={handle1TapConfirm}
          disabled={confirmingId === activeTx.id}
          style={[styles.confirmBtn, confirmingId === activeTx.id && styles.confirmBtnActive]}>
          <Text style={styles.confirmBtnText}>
            {confirmingId === activeTx.id ? 'Saving…' : '⚡ 1-Tap Confirm'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Idle State
  idleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0E17',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.18)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  idleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  idleRadarPing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  idleRadarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
  },
  idleMeta: {
    gap: 2,
  },
  idleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idleBadgeIcon: {
    fontSize: 12,
  },
  idleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.8,
  },
  idleSubtitle: {
    fontSize: 11,
    color: '#7E8B9F',
    fontWeight: '500',
  },
  simulatePill: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  simulatePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00F0FF',
  },

  // Active Radar Card
  radarCard: {
    backgroundColor: '#0E131F',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.35)',
    padding: 16,
    gap: 12,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  radarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveRadarPing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  liveRadarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
  },
  radarTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 1.2,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.18)',
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pendingBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.4,
  },
  radarHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 2,
  },
  stepBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepBtnText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '700',
  },
  inboxLink: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  inboxLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8E9BB0',
  },

  // Meta row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unmatchedPill: {
    backgroundColor: 'rgba(255, 149, 0, 0.15)',
    borderColor: 'rgba(255, 149, 0, 0.4)',
  },
  accountPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CFD7E6',
  },
  timeText: {
    fontSize: 11,
    color: '#7E8B9F',
    fontWeight: '500',
  },

  // Hero row
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  merchantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 22,
  },
  merchantMeta: {
    flex: 1,
    gap: 2,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  categorySub: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  amountSection: {
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  amountDebit: {
    color: '#FFFFFF',
  },
  amountCredit: {
    color: '#00E676',
    textShadowColor: 'rgba(0, 230, 118, 0.5)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },

  // SMS Snippet
  smsSnippetCapsule: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  smsSnippetText: {
    fontSize: 10.5,
    color: '#8E9BB0',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 14,
  },

  // Actions Dock
  actionDock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dismissBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  dismissBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  editBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  editBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#CFD7E6',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  confirmBtnActive: {
    opacity: 0.7,
  },
  confirmBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#06130D',
    letterSpacing: 0.3,
  },
});
