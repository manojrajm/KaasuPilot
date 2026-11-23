import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Category3DIcon } from '@/components/ui/Category3DIcon';
import { DEFAULT_CATEGORIES } from '@/data/seed/defaultCategories';
import { useCategories } from '@/hooks/useCategories';
import { formatPaise } from '@/domain/money/format';
import { Transaction } from '@/domain/types';
import { useAccounts } from '@/hooks/useAccounts';

interface TransactionDetailModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function TransactionDetailModal({
  visible,
  transaction,
  onClose,
  onDelete,
}: TransactionDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { byId: accountsById } = useAccounts();
  const { byId: categoriesById } = useCategories();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!visible || !transaction) return null;

  const isIncome = transaction.direction === 'credit';
  const category =
    categoriesById[transaction.categoryId] ||
    DEFAULT_CATEGORIES[0];
  const accountName =
    accountsById[transaction.accountId]?.name || 'Ledger Account';

  const formattedDate = new Date(transaction.txnDate).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(transaction.txnDate).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onDelete(transaction.id);
    setConfirmingDelete(false);
    onClose();
  };

  const handleClose = () => {
    setConfirmingDelete(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}>
      <Pressable onPress={handleClose} style={styles.modalOverlay}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.cockpitCard,
            isIncome ? styles.cockpitIncome : styles.cockpitExpense,
            { marginBottom: Math.max(insets.bottom, 16) },
          ]}>
          {/* Top Sheet Header */}
          <View style={styles.cardHeader}>
            <View style={styles.vaultPill}>
              <View
                style={[
                  styles.vaultDot,
                  isIncome ? styles.vaultDotIncome : styles.vaultDotExpense,
                ]}
              />
              <Text style={styles.vaultText}>
                {transaction.status.toUpperCase()} • ON-DEVICE
              </Text>
            </View>

            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Centered 3D Category Icon */}
          <View style={styles.iconSection}>
            <View
              style={[
                styles.iconGlowRing,
                isIncome ? styles.iconGlowIncome : styles.iconGlowExpense,
              ]}>
              <Category3DIcon
                emoji={category.emoji}
                color={category.color}
                gradientColors={category.gradientColors}
                size={58}
                selected={true}
              />
            </View>

            <Text style={styles.merchantTitle} numberOfLines={1}>
              {transaction.merchant}
            </Text>

            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>
                {category.name} • {isIncome ? 'Inflow' : 'Outflow'}
              </Text>
            </View>
          </View>

          {/* Hero Amount Display */}
          <View
            style={[
              styles.amountHeroBox,
              isIncome ? styles.amountHeroIncome : styles.amountHeroExpense,
            ]}>
            <Text
              style={[
                styles.amountValueText,
                isIncome ? styles.amountValueIncome : styles.amountValueExpense,
              ]}>
              {isIncome ? '+ ' : '- '}
              {formatPaise(transaction.amountPaise)}
            </Text>
            <Text style={styles.amountCurrencyLabel}>INDIAN RUPEES (INR)</Text>
          </View>

          {/* Telemetry Flight-Recorder Grid */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCell}>
              <Text style={styles.cellLabel}>TIMESTAMP</Text>
              <Text style={styles.cellValue}>
                {formattedDate} • {formattedTime}
              </Text>
            </View>

            <View style={styles.telemetryCell}>
              <Text style={styles.cellLabel}>ACCOUNT</Text>
              <Text style={styles.cellValue} numberOfLines={1}>
                {accountName}
              </Text>
            </View>

            {transaction.note ? (
              <View style={[styles.telemetryCell, styles.cellFullWidth]}>
                <Text style={styles.cellLabel}>REMARK / NOTE</Text>
                <Text style={styles.cellValue}>{transaction.note}</Text>
              </View>
            ) : null}

            {transaction.taxTag ? (
              <View style={styles.telemetryCell}>
                <Text style={styles.cellLabel}>TAX DEDUCTION</Text>
                <Text style={[styles.cellValue, styles.taxValue]}>
                  Section {transaction.taxTag} Eligible
                </Text>
              </View>
            ) : null}

            <View style={[styles.telemetryCell, styles.cellFullWidth]}>
              <Text style={styles.cellLabel}>SECURITY VAULT</Text>
              <Text style={styles.cellValueDim}>
                🔒 100% Offline • Stored strictly on device • Zero cloud sync
              </Text>
            </View>
          </View>

          {/* Action Row: Close vs Delete Transaction */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && styles.btnPressed,
              ]}>
              <Text style={styles.secondaryBtnText}>Close</Text>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                styles.deleteBtn,
                confirmingDelete && styles.deleteBtnConfirming,
                pressed && styles.btnPressed,
              ]}>
              <Text
                style={[
                  styles.deleteBtnText,
                  confirmingDelete && styles.deleteBtnTextConfirming,
                ]}>
                {confirmingDelete ? '⚠️ Confirm Delete?' : '🗑️ Delete'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cockpitCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0D111A',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1.6,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 18,
    gap: 16,
  },
  cockpitIncome: {
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  cockpitExpense: {
    borderColor: 'rgba(255, 59, 48, 0.35)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  vaultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vaultDotIncome: {
    backgroundColor: '#00E676',
  },
  vaultDotExpense: {
    backgroundColor: '#FF3B30',
  },
  vaultText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  iconSection: {
    alignItems: 'center',
    gap: 6,
  },
  iconGlowRing: {
    padding: 6,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  iconGlowIncome: {
    borderColor: 'rgba(0, 230, 118, 0.4)',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  iconGlowExpense: {
    borderColor: 'rgba(255, 184, 0, 0.4)',
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
  },
  merchantTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginTop: 4,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryPillText: {
    fontSize: 11,
    color: '#8E9BB0',
    fontWeight: '600',
  },
  amountHeroBox: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.2,
  },
  amountHeroIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  amountHeroExpense: {
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderColor: 'rgba(255, 59, 48, 0.25)',
  },
  amountValueText: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  amountValueIncome: {
    color: '#00E676',
  },
  amountValueExpense: {
    color: '#FFFFFF',
  },
  amountCurrencyLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  telemetryGrid: {
    backgroundColor: '#0F131C',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  telemetryCell: {
    gap: 2,
  },
  cellFullWidth: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 8,
  },
  cellLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  cellValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  taxValue: {
    color: '#FFB800',
  },
  cellValueDim: {
    fontSize: 11,
    color: '#8E9BB0',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 59, 48, 0.14)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  deleteBtnConfirming: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  deleteBtnTextConfirming: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
