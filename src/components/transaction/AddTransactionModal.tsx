import React, { useState, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  DEFAULT_ACCOUNTS,
} from '@/data/seed/defaultCategories';
import { Category3DIcon } from '@/components/ui/Category3DIcon';
import { IndianCurrencyBg } from '@/components/ui/IndianCurrencyBg';
import { TransactionFeedbackModal } from '@/components/transaction/TransactionFeedbackModal';
import { toPaise } from '@/domain/money/paise';
import { TransactionDirection } from '@/domain/types';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    merchant: string;
    amountPaise: number;
    direction: TransactionDirection;
    categoryId: string;
    accountId: string;
    note?: string;
    taxTag?: '80C' | '80D' | 'HRA' | null;
  }) => void;
}

export function AddTransactionModal({
  visible,
  onClose,
  onSave,
}: AddTransactionModalProps) {
  const insets = useSafeAreaInsets();
  const [direction, setDirection] = useState<TransactionDirection>('debit');
  const [amountInput, setAmountInput] = useState('');
  const [merchant, setMerchant] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('cat_food');
  const [selectedAccountId, setSelectedAccountId] = useState('acc_hdfc');
  const [note, setNote] = useState('');
  const [taxTag, setTaxTag] = useState<'80C' | '80D' | 'HRA' | null>(null);
  const [feedbackData, setFeedbackData] = useState<{
    visible: boolean;
    direction: TransactionDirection;
    amountPaise: number;
    merchant: string;
  } | null>(null);

  // Active categories based on dual Income vs Expense mode
  const isIncome = direction === 'credit';
  const activeCategories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Auto-switch category when direction changes if the current selection belongs to the other mode
  const handleToggleDirection = (newDir: TransactionDirection) => {
    if (newDir === direction) return;
    setDirection(newDir);
    if (newDir === 'credit') {
      const match = INCOME_CATEGORIES.find((c) => c.id === selectedCategoryId);
      if (!match) setSelectedCategoryId(INCOME_CATEGORIES[0].id);
    } else {
      const match = EXPENSE_CATEGORIES.find((c) => c.id === selectedCategoryId);
      if (!match) setSelectedCategoryId(EXPENSE_CATEGORIES[0].id);
    }
  };

  const resetForm = () => {
    setAmountInput('');
    setMerchant('');
    setNote('');
    setTaxTag(null);
  };

  const handleSave = () => {
    const paise = toPaise(amountInput);
    if (paise <= 0) {
      if (Platform.OS === 'web') window.alert('Please enter a valid amount');
      return;
    }
    const finalMerchant =
      merchant.trim() || (isIncome ? 'Income Deposit' : 'General Expense');

    onSave({
      merchant: finalMerchant,
      amountPaise: paise,
      direction,
      categoryId: selectedCategoryId,
      accountId: selectedAccountId,
      note: note.trim() || undefined,
      taxTag,
    });

    const savedDirection = direction;
    resetForm();

    // Trigger celebratory or sympathetic animated feedback
    setFeedbackData({
      visible: true,
      direction: savedDirection,
      amountPaise: paise,
      merchant: finalMerchant,
    });
  };

  const handleFeedbackClose = () => {
    setFeedbackData(null);
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible && !feedbackData}
        animationType="slide"
        transparent
        onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.sheetContainer}>
          {/* ======================================================== */}
          {/* ZONE 1: STICKY TOP COCKPIT HEADER (ALWAYS VISIBLE)        */}
          {/* ======================================================== */}
          <View style={styles.sheetTopRow}>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>

            <View style={styles.headerTitleContainer}>
              <Text
                style={[
                  styles.sheetTitle,
                  isIncome && styles.sheetTitleIncome,
                ]}>
                {isIncome ? 'NEW INCOME INFLOW' : 'NEW EXPENSE OUTFLOW'}
              </Text>
              <View style={styles.headerTelemetryPill}>
                <View
                  style={[
                    styles.telemetryDot,
                    isIncome && styles.telemetryDotIncome,
                  ]}
                />
                <Text style={styles.telemetryText}>LOCAL VAULT</Text>
              </View>
            </View>

            <Pressable onPress={resetForm} style={styles.resetBtn} hitSlop={12}>
              <Text style={styles.resetBtnText}>Clear</Text>
            </Pressable>
          </View>

          {/* DUAL MODE COCKPIT SELECTOR (EXPENSE VS INCOME) */}
          <View style={styles.directionToggleContainer}>
            <Pressable
              onPress={() => handleToggleDirection('debit')}
              style={[
                styles.directionBtn,
                !isIncome && styles.directionBtnActiveDebit,
              ]}>
              <Text
                style={[
                  styles.directionBtnText,
                  !isIncome && styles.directionBtnTextActive,
                ]}>
                💸 Expense
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleToggleDirection('credit')}
              style={[
                styles.directionBtn,
                isIncome && styles.directionBtnActiveCredit,
              ]}>
              <Text
                style={[
                  styles.directionBtnText,
                  isIncome && styles.directionBtnTextActive,
                ]}>
                💰 Income
              </Text>
            </Pressable>
          </View>

          {/* ======================================================== */}
          {/* ZONE 2: FLUID SCROLLABLE FORM BODY                        */}
          {/* ======================================================== */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={true}>
            {/* Amount Hero Card with Indian Currency Coins & Watermark */}
            <View
              style={[
                styles.amountHeroCard,
                isIncome && styles.amountHeroCardIncome,
              ]}>
              <IndianCurrencyBg opacity={0.16} />

              <View style={styles.amountTopMetaRow}>
                <Text style={styles.amountLabel}>ENTER AMOUNT (INR)</Text>
                <View
                  style={[
                    styles.directionBadge,
                    isIncome
                      ? styles.directionBadgeIncome
                      : styles.directionBadgeExpense,
                  ]}>
                  <Text
                    style={[
                      styles.directionBadgeText,
                      isIncome
                        ? styles.directionBadgeTextIncome
                        : styles.directionBadgeTextExpense,
                    ]}>
                    {isIncome ? '+ INFLOW' : '- OUTFLOW'}
                  </Text>
                </View>
              </View>

              <View style={styles.amountInputRow}>
                <Text
                  style={[
                    styles.rupeePrefix,
                    isIncome ? styles.rupeePrefixIncome : styles.rupeePrefixExpense,
                  ]}>
                  {isIncome ? '+ ₹' : '₹'}
                </Text>
                <TextInput
                  value={amountInput}
                  onChangeText={setAmountInput}
                  placeholder="0.00"
                  placeholderTextColor="#65738E"
                  keyboardType="decimal-pad"
                  style={styles.amountTextInput}
                  autoFocus={false}
                />
              </View>
            </View>

            {/* DUAL 3D CATEGORIES CAROUSEL */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>
                  {isIncome
                    ? 'INCOME STREAM (3D ACTION ICONS)'
                    : 'EXPENSE CATEGORY (3D ACTION ICONS)'}
                </Text>
                <Text style={styles.sectionSubCount}>
                  {activeCategories.length} items
                </Text>
              </View>

              <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}>
                {activeCategories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;

                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      style={[
                        styles.categoryItem,
                        isSelected &&
                          (isIncome
                            ? styles.categoryItemSelectedIncome
                            : styles.categoryItemSelected),
                      ]}>
                      <Category3DIcon
                        emoji={cat.emoji}
                        color={cat.color}
                        gradientColors={cat.gradientColors}
                        size={48}
                        selected={isSelected}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.categoryName,
                          isSelected &&
                            (isIncome
                              ? styles.categoryNameSelectedIncome
                              : styles.categoryNameSelected),
                        ]}>
                        {cat.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Merchant / Payee Input */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderLabel}>
                {isIncome ? 'PAYER / SOURCE' : 'MERCHANT / PAYEE'}
              </Text>
              <TextInput
                value={merchant}
                onChangeText={setMerchant}
                placeholder={
                  isIncome
                    ? 'e.g. Google India, Client Milestone, Tenant'
                    : 'e.g. Swiggy, Amazon, Uber, Indian Oil'
                }
                placeholderTextColor="#65738E"
                style={styles.standardTextInput}
              />
            </View>

            {/* Account Selector */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderLabel}>
                {isIncome ? 'DEPOSIT INTO ACCOUNT' : 'PAY FROM ACCOUNT'}
              </Text>
              <View style={styles.accountChipsRow}>
                {DEFAULT_ACCOUNTS.map((acc) => {
                  const isSelected = selectedAccountId === acc.id;

                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => setSelectedAccountId(acc.id)}
                      style={[
                        styles.accountChip,
                        isSelected &&
                          (isIncome
                            ? styles.accountChipSelectedIncome
                            : styles.accountChipSelected),
                      ]}>
                      <Text
                        style={[
                          styles.accountChipText,
                          isSelected &&
                            (isIncome
                              ? styles.accountChipTextSelectedIncome
                              : styles.accountChipTextSelected),
                        ]}>
                        {acc.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Optional Note & Tax Tag */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeaderLabel}>OPTIONAL NOTE & TAX</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={
                  isIncome
                    ? 'e.g. Annual bonus, Q3 invoice #4829'
                    : 'e.g. Dinner with team, medical receipt'
                }
                placeholderTextColor="#65738E"
                style={styles.standardTextInput}
              />

              <View style={styles.taxTagsRow}>
                <Text style={styles.taxTagPrompt}>Tax Section:</Text>
                {(['80C', '80D', 'HRA'] as const).map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => setTaxTag(taxTag === tag ? null : tag)}
                    style={[
                      styles.taxPill,
                      taxTag === tag && styles.taxPillActive,
                    ]}>
                    <Text
                      style={[
                        styles.taxPillText,
                        taxTag === tag && styles.taxPillTextActive,
                      ]}>
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* ======================================================== */}
          {/* ZONE 3: PERSISTENT DOCKED ACTION COCKPIT (ALWAYS VISIBLE) */}
          {/* ======================================================== */}
          <View
            style={[
              styles.dockedFooter,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}>
            {/* Local Privacy Micro-Telemetry */}
            <View style={styles.privacyNoticeRow}>
              <Text style={styles.privacyLockEmoji}>🔒</Text>
              <Text style={styles.privacyNoticeText}>
                100% On-Device Vault • Zero Cloud Sync • AES-256 Encrypted
              </Text>
            </View>

            {/* Radiant Golden Action Button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                isIncome && styles.saveButtonIncome,
                pressed && styles.saveButtonPressed,
              ]}>
              <Text
                style={[
                  styles.saveButtonText,
                  isIncome && styles.saveButtonTextIncome,
                ]}>
                {isIncome
                  ? '⚡ SAVE INCOME INFLOW'
                  : '⚡ SAVE EXPENSE OUTFLOW'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {feedbackData && (
      <TransactionFeedbackModal
        visible={feedbackData.visible}
        direction={feedbackData.direction}
        amountPaise={feedbackData.amountPaise}
        merchant={feedbackData.merchant}
        onClose={handleFeedbackClose}
      />
    )}
  </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0D111A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: '88%',
    maxHeight: '92%',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitleContainer: {
    alignItems: 'center',
    gap: 3,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 1.1,
  },
  sheetTitleIncome: {
    color: '#00E676',
  },
  headerTelemetryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  telemetryDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFB800',
  },
  telemetryDotIncome: {
    backgroundColor: '#00E676',
  },
  telemetryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  directionToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  directionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  directionBtnActiveDebit: {
    backgroundColor: 'rgba(255, 59, 48, 0.16)',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  directionBtnActiveCredit: {
    backgroundColor: 'rgba(0, 230, 118, 0.16)',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  directionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  directionBtnTextActive: {
    color: '#FFFFFF',
  },
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  amountHeroCard: {
    backgroundColor: 'rgba(15, 19, 28, 0.95)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 184, 0, 0.25)',
    position: 'relative',
    overflow: 'hidden',
  },
  amountHeroCardIncome: {
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  amountTopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 1.2,
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  directionBadgeExpense: {
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  directionBadgeIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  directionBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  directionBadgeTextExpense: {
    color: '#FF6B6B',
  },
  directionBadgeTextIncome: {
    color: '#00E676',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rupeePrefix: {
    fontSize: 32,
    fontWeight: '900',
  },
  rupeePrefixExpense: {
    color: '#FFB800',
  },
  rupeePrefixIncome: {
    color: '#00E676',
  },
  amountTextInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 1,
  },
  sectionSubCount: {
    fontSize: 10,
    fontWeight: '600',
    color: '#65738E',
  },
  categoryScroll: {
    gap: 12,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  categoryItem: {
    alignItems: 'center',
    gap: 6,
    padding: 6,
    borderRadius: 14,
    width: 68,
  },
  categoryItemSelected: {
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
  },
  categoryItemSelectedIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.14)',
  },
  categoryName: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8E9BB0',
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: '#FFB800',
    fontWeight: '800',
  },
  categoryNameSelectedIncome: {
    color: '#00E676',
    fontWeight: '800',
  },
  standardTextInput: {
    backgroundColor: '#0F131C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
  },
  accountChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  accountChipSelected: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderColor: '#FFB800',
  },
  accountChipSelectedIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: '#00E676',
  },
  accountChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  accountChipTextSelected: {
    color: '#FFB800',
    fontWeight: '700',
  },
  accountChipTextSelectedIncome: {
    color: '#00E676',
    fontWeight: '700',
  },
  taxTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  taxTagPrompt: {
    fontSize: 11,
    color: '#8E9BB0',
    fontWeight: '500',
  },
  taxPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  taxPillActive: {
    backgroundColor: 'rgba(255, 184, 0, 0.25)',
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  taxPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  taxPillTextActive: {
    color: '#FFB800',
  },
  dockedFooter: {
    backgroundColor: '#0A0D15',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  privacyNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 2,
  },
  privacyLockEmoji: {
    fontSize: 11,
  },
  privacyNoticeText: {
    fontSize: 10.5,
    color: '#65738E',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  saveButton: {
    backgroundColor: '#FFB800',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  saveButtonIncome: {
    backgroundColor: '#00E676',
    shadowColor: '#00E676',
  },
  saveButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  saveButtonText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#07090E',
    letterSpacing: 0.6,
  },
  saveButtonTextIncome: {
    color: '#07090E',
  },
});
