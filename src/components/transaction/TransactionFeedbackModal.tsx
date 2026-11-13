import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { formatPaise } from '@/domain/money/format';
import { TransactionDirection } from '@/domain/types';
import { IncomeVideoReaction } from '@/components/transaction/IncomeVideoReaction';
import { ExpenseVideoReaction } from '@/components/transaction/ExpenseVideoReaction';

interface TransactionFeedbackModalProps {
  visible: boolean;
  direction: TransactionDirection;
  amountPaise: number;
  merchant: string;
  onClose: () => void;
}

export function TransactionFeedbackModal({
  visible,
  direction,
  amountPaise,
  merchant,
  onClose,
}: TransactionFeedbackModalProps) {
  const isIncome = direction === 'credit';

  // Auto-dismiss after 2.8 seconds
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2800);

    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.cardContainer,
            isIncome ? styles.cardIncome : styles.cardExpense,
          ]}>
          {/* Top Status Pill */}
          <View
            style={[
              styles.statusPill,
              isIncome ? styles.statusPillIncome : styles.statusPillExpense,
            ]}>
            <View
              style={[
                styles.pulseDot,
                isIncome ? styles.pulseDotIncome : styles.pulseDotExpense,
              ]}
            />
            <Text
              style={[
                styles.statusText,
                isIncome ? styles.statusTextIncome : styles.statusTextExpense,
              ]}>
              {isIncome ? '⚡ 3D QUANTUM VAULT // INFLOW ⚡' : '💔 EXPENSE OUTFLOW'}
            </Text>
          </View>

          {/* Video Reactions: Income MP4 vs Expense MP4 */}
          <View style={styles.gifWrapper}>
            {isIncome ? (
              <IncomeVideoReaction size={175} />
            ) : (
              <ExpenseVideoReaction size={175} />
            )}
          </View>

          {/* Amount Badge */}
          <Text
            style={[
              styles.amountText,
              isIncome ? styles.amountIncome : styles.amountExpense,
            ]}>
            {isIncome ? '+ ' : '- '}
            {formatPaise(amountPaise)}
          </Text>

          {/* Merchant / Description */}
          <Text style={styles.merchantText} numberOfLines={1}>
            {merchant}
          </Text>

          {/* Sympathetic or Celebratory Message */}
          <Text style={styles.punchlineText}>
            {isIncome
              ? '🎉 3D Vault Core Supercharged! Funds secured with zero-cloud encryption.'
              : '💸 Ouch! Wallet felt that one. Stay disciplined, hero!'}
          </Text>

          {/* Dismiss Action Button */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.actionBtn,
              isIncome ? styles.actionBtnIncome : styles.actionBtnExpense,
              pressed && styles.actionBtnPressed,
            ]}>
            <Text style={styles.actionBtnText}>
              {isIncome ? '⚡ Secure In Vault' : 'Got It, Move On'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0D111A',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 16,
    gap: 12,
  },
  cardIncome: {
    borderColor: 'rgba(0, 230, 118, 0.45)',
    shadowColor: '#00E676',
  },
  cardExpense: {
    borderColor: 'rgba(255, 59, 48, 0.45)',
    shadowColor: '#FF3B30',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusPillIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  statusPillExpense: {
    backgroundColor: 'rgba(255, 59, 48, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseDotIncome: {
    backgroundColor: '#00E676',
  },
  pulseDotExpense: {
    backgroundColor: '#FF3B30',
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusTextIncome: {
    color: '#00E676',
  },
  statusTextExpense: {
    color: '#FF6B6B',
  },
  gifWrapper: {
    width: 170,
    height: 170,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  amountText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  amountIncome: {
    color: '#00E676',
    textShadowColor: 'rgba(0, 230, 118, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  amountExpense: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 59, 48, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  merchantText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#8E9BB0',
    marginTop: -4,
  },
  punchlineText: {
    fontSize: 12.5,
    color: '#C5D1E0',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  actionBtnIncome: {
    backgroundColor: '#00E676',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnExpense: {
    backgroundColor: '#FFB800',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  actionBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  actionBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#07090E',
    letterSpacing: 0.4,
  },
});
