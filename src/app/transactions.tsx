import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Animated,
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
import { useAccounts } from '@/hooks/useAccounts';
import { AddTransactionModal } from '@/components/transaction/AddTransactionModal';
import { TransactionDetailModal } from '@/components/transaction/TransactionDetailModal';
import {
  DateFilterBar,
  DateFilterRange,
  computeFilterRange,
} from '@/components/transaction/DateFilterBar';
import { SpendingDonutCard } from '@/components/transaction/SpendingDonutCard';
import { DailyTransactionGroup } from '@/components/transaction/DailyTransactionGroup';
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
  const { byId: accountsById } = useAccounts();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  // Date Filter & Donut mode state
  const [dateFilter, setDateFilter] = useState<DateFilterRange>(() =>
    computeFilterRange('this_month')
  );
  const [donutMode, setDonutMode] = useState<'debit' | 'credit'>('debit');

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
    filters,
    setDirectionFilter,
    setSearchQuery,
    setCategoryFilter,
    setDateRange,
    addTransaction,
    deleteTransaction,
  } = useTransactions();

  // Initialize date range filter on mount
  useEffect(() => {
    const initial = computeFilterRange('this_month');
    setDateRange(initial.startDate, initial.endDate);
  }, [setDateRange]);

  const handleFilterRangeChange = (newRange: DateFilterRange) => {
    setDateFilter(newRange);
    setDateRange(newRange.startDate, newRange.endDate);
  };

  // Group transactions by calendar date (YYYY-MM-DD) sorted chronologically descending
  const groupedTransactionList = useMemo(() => {
    const map = new Map<
      string,
      { dateTimestamp: number; dateTitle: string; items: Transaction[] }
    >();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    transactions.forEach((tx) => {
      const txDate = new Date(tx.txnDate);
      const dateKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}-${String(txDate.getDate()).padStart(2, '0')}`;

      const dayStart = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate(), 0, 0, 0);
      const timestamp = dayStart.getTime();

      let dateTitle = dayStart
        .toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
        .toUpperCase();

      if (timestamp === today.getTime()) {
        dateTitle = `TODAY • ${dayStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}`;
      } else if (timestamp === yesterday.getTime()) {
        dateTitle = `YESTERDAY • ${dayStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}`;
      }

      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateTimestamp: timestamp,
          dateTitle,
          items: [],
        });
      }

      map.get(dateKey)!.items.push(tx);
    });

    return Array.from(map.values()).sort((a, b) => b.dateTimestamp - a.dateTimestamp);
  }, [transactions]);

  // Aggregate Period Totals (Income, Expenses, Net Cashflow) for the currently filtered view
  const periodTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((tx) => {
      if (tx.direction === 'debit') {
        expense += tx.amountPaise;
      } else {
        income += tx.amountPaise;
      }
    });
    return {
      totalIncomePaise: income,
      totalExpensePaise: expense,
      netPaise: income - expense,
      count: transactions.length,
    };
  }, [transactions]);

  // Categories visible in filter chips according to current direction filter
  const visibleCategories = useMemo(() => {
    if (filters.direction === 'credit') return INCOME_CATEGORIES;
    if (filters.direction === 'debit') return EXPENSE_CATEGORIES;
    return DEFAULT_CATEGORIES;
  }, [filters.direction]);

  const handleSelectDirection = (dir: 'all' | 'debit' | 'credit') => {
    setDirectionFilter(dir);
    if (dir === 'debit' || dir === 'credit') {
      setDonutMode(dir);
    }
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

          {/* 1. Date Scope Filter Bar (Presets & Month Stepper) */}
          <DateFilterBar currentFilter={dateFilter} onFilterChange={handleFilterRangeChange} />

          {/* 2. Round Animated Donut Bar Graph (Matching User's Uploaded Design) */}
          <SpendingDonutCard
            transactions={transactions}
            selectedCategoryId={filters.categoryId}
            onSelectCategory={setCategoryFilter}
            periodLabel={dateFilter.scopeLabel}
            mode={donutMode}
            onToggleMode={(newMode) => {
              setDonutMode(newMode);
              if (filters.direction !== 'all' && filters.direction !== newMode) {
                setDirectionFilter(newMode);
              }
            }}
          />

          {/* 3. Period Telemetry Strip (Income, Spent, Net Cashflow) */}
          <View style={styles.periodSummaryCard}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>PERIOD INCOME</Text>
              <Text style={styles.summaryIncomeValue}>
                +{formatPaise(periodTotals.totalIncomePaise)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>PERIOD SPENT</Text>
              <Text style={styles.summarySpentValue}>
                -{formatPaise(periodTotals.totalExpensePaise)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>NET CASHFLOW</Text>
              <Text
                style={[
                  styles.summaryNetValue,
                  periodTotals.netPaise >= 0 ? styles.summaryNetPositive : styles.summaryNetNegative,
                ]}>
                {periodTotals.netPaise >= 0 ? '+' : '-'}
                {formatPaise(Math.abs(periodTotals.netPaise))}
              </Text>
            </View>
          </View>

          {/* 4. Direction Filter Pills */}
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

          {/* 5. Category Quick Filter Chips */}
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

          {/* 6. Date-Grouped Transaction List with Per-Day Totals */}
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔎</Text>
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptySubtitle}>
                No entries match your search or date filter ({dateFilter.scopeLabel}).
              </Text>
              <Pressable
                onPress={() => setShowAddModal(true)}
                style={styles.emptyAddBtn}>
                <Text style={styles.emptyAddBtnText}>+ Add Transaction</Text>
              </Pressable>
            </View>
          ) : (
            groupedTransactionList.map((group) => (
              <DailyTransactionGroup
                key={group.dateTitle}
                dateTitle={group.dateTitle}
                transactions={group.items}
                accountsById={accountsById}
                onPressTransaction={handleTransactionPress}
              />
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
    fontWeight: '800',
    color: '#FFB800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F131C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    padding: 0,
  },
  clearSearchText: {
    color: '#65738E',
    fontSize: 12,
    fontWeight: '700',
  },
  periodSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#0C0E14',
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
    color: '#FF6B61',
  },
  summaryNetValue: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  summaryNetPositive: {
    color: '#00F0FF',
  },
  summaryNetNegative: {
    color: '#FF6B61',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F131C',
    borderRadius: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  filterPillSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#FFFFFF',
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
    fontWeight: '700',
    color: '#8E9BB0',
  },
  filterPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  filterPillTextSelectedDebit: {
    color: '#FF6B61',
    fontWeight: '800',
  },
  filterPillTextSelectedCredit: {
    color: '#00E676',
    fontWeight: '800',
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
