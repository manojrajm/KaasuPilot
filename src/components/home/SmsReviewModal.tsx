import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/data/seed/defaultCategories';
import { formatPaise } from '@/domain/money/format';
import { extractUnmatchedBankInfo } from '@/domain/sms/types';
import { Account, Transaction } from '@/domain/types';
import { smsIngestionService } from '@/services/smsIngestion';

interface SmsReviewModalProps {
  visible: boolean;
  onClose: () => void;
  pendingTransactions: Transaction[];
  accounts: Account[];
  accountsById: Record<string, Account>;
  onApprove: (id: string, updates?: { categoryId?: string; merchant?: string; accountId?: string }) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

interface CardEditState {
  merchant?: string;
  categoryId?: string;
  accountId?: string;
  showAccountPicker?: boolean;
}

export function SmsReviewModal({
  visible,
  onClose,
  pendingTransactions,
  accounts,
  accountsById,
  onApprove,
  onDismiss,
}: SmsReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [cardEdits, setCardEdits] = useState<Record<string, CardEditState>>({});
  const [showSimulateOptions, setShowSimulateOptions] = useState(false);

  const updateCard = (txId: string, updates: Partial<CardEditState>) => {
    setCardEdits((prev) => ({
      ...prev,
      [txId]: { ...prev[txId], ...updates },
    }));
  };

  const handleSimulate = async (sampleIndex: number) => {
    const samples = smsIngestionService.getSampleSms(accounts);
    const sample = samples[sampleIndex];
    if (!sample) return;

    const res = await smsIngestionService.ingestSms(sample);
    if (res.isDuplicate) {
      Alert.alert('Duplicate Detected', 'This SMS has already been parsed and added to the ledger.');
    } else if (res.accepted) {
      setShowSimulateOptions(false);
    }
  };

  const handleConfirmApprove = async (tx: Transaction) => {
    const edit = cardEdits[tx.id] || {};
    const finalMerchant = (edit.merchant !== undefined ? edit.merchant : tx.merchant).trim() || tx.merchant;
    const finalCategoryId = edit.categoryId || tx.categoryId;
    const finalAccountId = edit.accountId || tx.accountId;

    await onApprove(tx.id, {
      merchant: finalMerchant,
      categoryId: finalCategoryId,
      accountId: finalAccountId,
    });
  };

  const cardAccount = accounts.find((a) => a.type === 'card' || a.lastFourDigits);
  const sampleCardLabel = cardAccount?.name || 'Saved Card';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Top Drag Handle Indicator */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.smsBadge}>
                <Text style={styles.smsBadgeIcon}>📬</Text>
                <Text style={styles.smsBadgeText}>SMS INTELLIGENCE</Text>
              </View>
              <Text style={styles.title}>
                Review Inbox ({pendingTransactions.length})
              </Text>
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
            {/* Simulation Toolbar for rapid test */}
            <View style={styles.simulateBar}>
              <View style={styles.simulateBarLeft}>
                <Text style={styles.simulateDot}>●</Text>
                <Text style={styles.simulateLabel}>100% On-Device Regex Parser Active</Text>
              </View>
              <Pressable
                onPress={() => setShowSimulateOptions((prev) => !prev)}
                style={styles.simulateBtn}>
                <Text style={styles.simulateBtnText}>
                  {showSimulateOptions ? 'Hide Test ▲' : '＋ Simulate Bank SMS ▼'}
                </Text>
              </Pressable>
            </View>

            {showSimulateOptions ? (
              <View style={styles.simulatePillsRow}>
                <Pressable onPress={() => handleSimulate(0)} style={styles.simChip}>
                  <Text style={styles.simChipText}>🍔 Swiggy ₹349 ({sampleCardLabel})</Text>
                </Pressable>
                <Pressable onPress={() => handleSimulate(1)} style={styles.simChip}>
                  <Text style={styles.simChipText}>⛽ Shell Fuel ₹2,000 ({sampleCardLabel})</Text>
                </Pressable>
                <Pressable onPress={() => handleSimulate(2)} style={[styles.simChip, styles.simChipWarning]}>
                  <Text style={[styles.simChipText, styles.simChipWarningText]}>
                    ⚠️ Blinkit ₹640 (Unmatched HDFC ••4410)
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleSimulate(3)} style={styles.simChip}>
                  <Text style={styles.simChipText}>💰 Salary ₹62,000 ({sampleCardLabel})</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Empty State */}
            {pendingTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>✨</Text>
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySub}>
                  No bank SMS pending review. Incoming bank SMS will appear here with instant account and category editing.
                </Text>
              </View>
            ) : null}

            {/* Pending Items */}
            {pendingTransactions.map((tx) => {
              const edit = cardEdits[tx.id] || {};
              const isCredit = tx.direction === 'credit';
              const categories = isCredit ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

              const activeAccountId = edit.accountId ?? tx.accountId;
              const activeCategoryId = edit.categoryId ?? tx.categoryId;
              const activeMerchant = edit.merchant !== undefined ? edit.merchant : tx.merchant;
              const account = accountsById[activeAccountId];

              const unmatched = extractUnmatchedBankInfo(tx.note);
              const isAccountPickerOpen = edit.showAccountPicker ?? Boolean(unmatched);

              return (
                <View key={tx.id} style={styles.txCard}>
                  {/* Unmatched Bank Alert Banner */}
                  {unmatched ? (
                    <View style={styles.unmatchedAlertBanner}>
                      <View style={styles.unmatchedRow}>
                        <Text style={styles.unmatchedIcon}>⚠️</Text>
                        <Text style={styles.unmatchedTitle}>
                          UNMATCHED BANK: {unmatched.detectedBankCode} ••{unmatched.detectedLastFour}
                        </Text>
                      </View>
                      <Text style={styles.unmatchedSubtitle}>
                        This bank card is not yet registered. Tap an account below to select which card to charge:
                      </Text>
                    </View>
                  ) : null}

                  {/* Top Row: Account Pill & Amount */}
                  <View style={styles.cardTopRow}>
                    <Pressable
                      onPress={() => updateCard(tx.id, { showAccountPicker: !isAccountPickerOpen })}
                      style={styles.accountBadge}>
                      <Text style={styles.accountBadgeText}>
                        {account?.type === 'cash' ? '💵' : '🏦'} {account?.name ?? 'Account'}{' '}
                        {account?.lastFourDigits ? `•• ${account.lastFourDigits}` : ''}
                      </Text>
                      <Text style={styles.dropdownCaret}>▾</Text>
                    </Pressable>

                    <Text
                      style={[
                        styles.cardAmount,
                        isCredit ? styles.amountCredit : styles.amountDebit,
                      ]}>
                      {isCredit ? '+ ' : '- '}
                      {formatPaise(tx.amountPaise)}
                    </Text>
                  </View>

                  {/* Interactive Account Selector Chips */}
                  {isAccountPickerOpen ? (
                    <View style={styles.accountSelectorSection}>
                      <Text style={styles.sectionSmallLabel}>SELECT DESTINATION ACCOUNT:</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.selectorScroll}>
                        {accounts.map((acc) => {
                          const isSel = acc.id === activeAccountId;
                          return (
                            <Pressable
                              key={acc.id}
                              onPress={() =>
                                updateCard(tx.id, {
                                  accountId: acc.id,
                                  showAccountPicker: false,
                                })
                              }
                              style={[
                                styles.accountOptionChip,
                                isSel && styles.accountOptionChipActive,
                              ]}>
                              <Text style={styles.accountOptionIcon}>
                                {acc.type === 'cash' ? '💵' : '🏦'}
                              </Text>
                              <Text
                                style={[
                                  styles.accountOptionText,
                                  isSel && styles.accountOptionTextActive,
                                ]}>
                                {acc.name} {acc.lastFourDigits ? `••${acc.lastFourDigits}` : ''}
                              </Text>
                              {isSel ? <Text style={styles.checkIcon}>✓</Text> : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}

                  {/* Merchant Editable Input */}
                  <View style={styles.merchantEditRow}>
                    <Text style={styles.fieldLabel}>Merchant:</Text>
                    <TextInput
                      value={activeMerchant}
                      onChangeText={(text) => updateCard(tx.id, { merchant: text })}
                      style={styles.merchantInput}
                      placeholder="Merchant Name"
                      placeholderTextColor="#5A667D"
                    />
                  </View>

                  {/* Interactive Category Selector (Direct Chips) */}
                  <View style={styles.categoryPickerSection}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.fieldLabel}>Category Classification:</Text>
                      <Text style={styles.activeCategoryPill}>
                        {categories.find((c) => c.id === activeCategoryId)?.emoji}{' '}
                        {categories.find((c) => c.id === activeCategoryId)?.name ?? 'Category'}
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.categoryScroll}>
                      {categories.map((c) => {
                        const isSel = activeCategoryId === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => updateCard(tx.id, { categoryId: c.id })}
                            style={[styles.catChip, isSel && styles.catChipActive]}>
                            <Text style={styles.catEmoji}>{c.emoji}</Text>
                            <Text style={[styles.catName, isSel && styles.catNameActive]}>
                              {c.name}
                            </Text>
                            {isSel ? <Text style={styles.checkIcon}>✓</Text> : null}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* SMS Raw Snippet */}
                  <View style={styles.smsSnippetBox}>
                    <Text style={styles.smsSnippetText} numberOfLines={2}>
                      💬 {tx.note?.replace(/\[UNMATCHED:[^\]]+\]\s*/, '') || 'Bank SMS message'}
                    </Text>
                    <Text style={styles.dateText}>
                      {new Date(tx.txnDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  {/* Action Buttons: 1-Tap Approve vs Dismiss */}
                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => onDismiss(tx.id)}
                      style={({ pressed }) => [styles.dismissBtn, pressed && styles.btnPressed]}>
                      <Text style={styles.dismissBtnText}>✕ Dismiss</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleConfirmApprove(tx)}
                      style={({ pressed }) => [styles.approveBtn, pressed && styles.btnPressed]}>
                      <Text style={styles.approveBtnText}>✓ Approve & Record</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
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
  headerLeft: {
    gap: 4,
  },
  smsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  smsBadgeIcon: {
    fontSize: 10,
  },
  smsBadgeText: {
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
    paddingBottom: 90,
    gap: Spacing.four,
  },
  simulateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 240, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  simulateBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  simulateDot: {
    color: '#00E676',
    fontSize: 10,
  },
  simulateLabel: {
    color: '#8A96AD',
    fontSize: 11,
    fontWeight: '600',
  },
  simulateBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  simulateBtnText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  simulatePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 10,
  },
  simChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  simChipText: {
    color: '#DCE4F0',
    fontSize: 11.5,
    fontWeight: '600',
  },
  simChipWarning: {
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    borderColor: '#FFB800',
  },
  simChipWarningText: {
    color: '#FFB800',
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  emptySub: {
    color: '#5A667D',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 18,
  },
  txCard: {
    backgroundColor: '#0F1420',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 12,
  },
  unmatchedAlertBanner: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  unmatchedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unmatchedIcon: {
    fontSize: 14,
  },
  unmatchedTitle: {
    color: '#FF6B61',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  unmatchedSubtitle: {
    color: '#FFB4AB',
    fontSize: 11,
    lineHeight: 15,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  accountBadgeText: {
    color: '#DCE4F0',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownCaret: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '900',
  },
  amountDebit: {
    color: '#FFFFFF',
  },
  amountCredit: {
    color: '#00E676',
  },
  accountSelectorSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
  },
  sectionSmallLabel: {
    color: '#8A96AD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  selectorScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  accountOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  accountOptionChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  accountOptionIcon: {
    fontSize: 12,
  },
  accountOptionText: {
    color: '#8A96AD',
    fontSize: 11.5,
    fontWeight: '600',
  },
  accountOptionTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  checkIcon: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '900',
  },
  merchantEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldLabel: {
    color: '#8A96AD',
    fontSize: 11,
    fontWeight: '700',
  },
  merchantInput: {
    flex: 1,
    backgroundColor: '#07090E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  categoryPickerSection: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeCategoryPill: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  catEmoji: {
    fontSize: 13,
  },
  catName: {
    color: '#8A96AD',
    fontSize: 11.5,
    fontWeight: '600',
  },
  catNameActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  smsSnippetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  smsSnippetText: {
    color: '#5A667D',
    fontSize: 11,
    flex: 1,
  },
  dateText: {
    color: '#5A667D',
    fontSize: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  dismissBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 107, 97, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 97, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    color: '#FF6B61',
    fontSize: 12.5,
    fontWeight: '800',
  },
  approveBtn: {
    flex: 2,
    backgroundColor: '#00F0FF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  approveBtnText: {
    color: '#07090E',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
