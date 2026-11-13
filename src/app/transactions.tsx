import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTransactions } from '@/hooks/useTransactions';
import { TransactionCard } from '@/components/transaction/TransactionCard';
import { AddTransactionModal } from '@/components/transaction/AddTransactionModal';
import { TransactionDetailModal } from '@/components/transaction/TransactionDetailModal';
import {
  DEFAULT_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '@/data/seed/defaultCategories';
import { formatPaise } from '@/domain/money/format';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Transaction } from '@/domain/types';

export default function TransactionsScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  // Tesla Cockpit Entrance Transition
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const {
    transactions,
    totals,
    filters,
    setDirectionFilter,
    setSearchQuery,
    setCategoryFilter,
    addTransaction,
    deleteTransaction,
  } = useTransactions();

  // Group transactions by date heading (Today, Yesterday, Earlier)
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    transactions.forEach((tx) => {
      const txDate = new Date(tx.txnDate);
      txDate.setHours(0, 0, 0, 0);

      let key = 'EARLIER THIS MONTH';
      if (txDate.getTime() === today.getTime()) {
        key = 'TODAY';
      } else if (txDate.getTime() === yesterday.getTime()) {
        key = 'YESTERDAY';
      } else {
        key = txDate.toLocaleDateString([], {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }).toUpperCase();
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });

    return groups;
  }, [transactions]);

  // Categories visible in filter chips according to current direction filter
  const visibleCategories = useMemo(() => {
    if (filters.direction === 'credit') return INCOME_CATEGORIES;
    if (filters.direction === 'debit') return EXPENSE_CATEGORIES;
    return DEFAULT_CATEGORIES;
  }, [filters.direction]);

  const handleSelectDirection = (dir: 'all' | 'debit' | 'credit') => {
    setDirectionFilter(dir);
    // If currently filtered by a category that is not in the new direction, reset it
    if (filters.categoryId) {
      const isValid =
        dir === 'credit'
          ? INCOME_CATEGORIES.some((c) => c.id === filters.categoryId)
          : dir === 'debit'
          ? EXPENSE_CATEGORIES.some((c) => c.id === filters.categoryId)
          : true;
      if (!isValid) setCategoryFilter(undefined);
    }
  };

  const handleTransactionPress = (tx: Transaction) => {
    setSelectedDetailTx(tx);
  };

  return (
    <View style={styles.screenContainer}>
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (data) => {
          await addTransaction({
            ...data,
            txnDate: new Date().toISOString(),
            source: 'manual',
            status: 'confirmed',
          });
        }}
      />

      {/* Tesla Cockpit Transaction Inspection & Deletion Sheet */}
      <TransactionDetailModal
        visible={selectedDetailTx !== null}
        transaction={selectedDetailTx}
        onClose={() => setSelectedDetailTx(null)}
        onDelete={(id) => {
          deleteTransaction(id);
          setSelectedDetailTx(null);
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(safeAreaInsets.top, Spacing.three),
            paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.six + 48,
          },
        ]}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}>
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerTitle}>TRANSACTIONS</Text>
              <View style={styles.localVaultRow}>
                <View style={styles.greenPulse} />
                <Text style={styles.localVaultText}>ON-DEVICE LEDGER • 100% PRIVATE</Text>
              </View>
            </View>

            <Pressable onPress={() => setShowAddModal(true)} style={styles.quickAddHeaderBtn}>
              <Text style={styles.quickAddHeaderText}>+ Add</Text>
            </Pressable>
          </View>

          {/* Search Input */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={filters.searchQuery || ''}
              onChangeText={setSearchQuery}
              placeholder="Search merchants, remarks..."
              placeholderTextColor="#65738E"
              style={styles.searchInput}
            />
            {filters.searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Text style={styles.clearSearchText}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Direction Filter Pills */}
          <View style={styles.filterPillsRow}>
            {(['all', 'debit', 'credit'] as const).map((dir) => {
              const isSelected = filters.direction === dir;
              const label =
                dir === 'all' ? 'All (Both)' : dir === 'debit' ? '💸 Expenses' : '💰 Income';

              return (
                <Pressable
                  key={dir}
                  onPress={() => handleSelectDirection(dir)}
                  style={[
                    styles.filterPill,
                    isSelected && styles.filterPillSelected,
                    isSelected && dir === 'credit' && styles.filterPillSelectedCredit,
                    isSelected && dir === 'debit' && styles.filterPillSelectedDebit,
                  ]}>
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && styles.filterPillTextSelected,
                      isSelected && dir === 'credit' && styles.filterPillTextSelectedCredit,
                      isSelected && dir === 'debit' && styles.filterPillTextSelectedDebit,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Category Quick Filter Chips */}
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterScroll}>
            <Pressable
              onPress={() => setCategoryFilter(undefined)}
              style={[
                styles.categoryChip,
                !filters.categoryId && styles.categoryChipSelected,
              ]}>
              <Text
                style={[
                  styles.categoryChipText,
                  !filters.categoryId && styles.categoryChipTextSelected,
                ]}>
                All Categories ({visibleCategories.length})
              </Text>
            </Pressable>

            {visibleCategories.map((cat) => {
              const isSelected = filters.categoryId === cat.id;

              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryFilter(isSelected ? undefined : cat.id)}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                  ]}>
                  <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Period Summary Card */}
          <View style={styles.periodSummaryCard}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>TOTAL INCOME</Text>
              <Text style={styles.summaryIncomeValue}>
                +{formatPaise(totals.totalIncomePaise)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>TOTAL SPENT</Text>
              <Text style={styles.summarySpentValue}>
                -{formatPaise(totals.totalExpensePaise)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>TOTAL TXNS</Text>
              <Text style={styles.summaryCountValue}>{transactions.length}</Text>
            </View>
          </View>

          {/* Date-Grouped Transaction List */}
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔎</Text>
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or add a new transaction locally.
              </Text>
              <Pressable
                onPress={() => setShowAddModal(true)}
                style={styles.emptyAddBtn}>
                <Text style={styles.emptyAddBtnText}>+ Add Transaction</Text>
              </Pressable>
            </View>
          ) : (
            Object.entries(groupedTransactions).map(([dateGroup, items]) => (
              <View key={dateGroup} style={styles.dateSection}>
                <View style={styles.dateHeaderRow}>
                  <Text style={styles.dateHeaderText}>{dateGroup}</Text>
                  <Text style={styles.dateCountText}>{items.length} items</Text>
                </View>

                {items.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    onPress={() => handleTransactionPress(tx)}
                  />
                ))}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  localVaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  localVaultText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  quickAddHeaderBtn: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFB800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  quickAddHeaderText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFB800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F131C',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13.5,
  },
  clearSearchText: {
    fontSize: 13,
    color: '#8E9BB0',
    paddingHorizontal: 4,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#0F131C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterPillSelected: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderColor: '#FFB800',
  },
  filterPillSelectedDebit: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderColor: '#FF3B30',
  },
  filterPillSelectedCredit: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: '#00E676',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  filterPillTextSelected: {
    color: '#FFB800',
    fontWeight: '700',
  },
  filterPillTextSelectedDebit: {
    color: '#FF6B6B',
  },
  filterPillTextSelectedCredit: {
    color: '#00E676',
  },
  categoryFilterScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F131C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: '#00F0FF',
  },
  categoryChipEmoji: {
    fontSize: 13,
  },
  categoryChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  categoryChipTextSelected: {
    color: '#00F0FF',
    fontWeight: '700',
  },
  periodSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#0D111A',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  summaryIncomeValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#00E676',
  },
  summarySpentValue: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryCountValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFB800',
  },
  dateSection: {
    gap: 4,
    marginTop: 6,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  dateHeaderText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1,
  },
  dateCountText: {
    fontSize: 10.5,
    color: '#65738E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#8E9BB0',
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyAddBtn: {
    backgroundColor: '#FFB800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyAddBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#07090E',
  },
});
