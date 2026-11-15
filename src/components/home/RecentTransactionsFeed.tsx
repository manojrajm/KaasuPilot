import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { formatPaise } from '@/domain/money/format';
import { TransactionItem } from '@/hooks/useHomeDashboard';

interface RecentTransactionsFeedProps {
  transactions: TransactionItem[];
  onPressViewAll?: () => void;
  onPressTransaction?: (tx: TransactionItem) => void;
}

export function RecentTransactionsFeed({
  transactions,
  onPressViewAll,
  onPressTransaction,
}: RecentTransactionsFeedProps) {
  return (
    <View style={styles.container}>
      {/* Feed Header */}
      <View style={styles.feedHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerPulseDot}>●</Text>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        </View>
        <Pressable onPress={onPressViewAll} hitSlop={10} style={styles.viewAllBtn}>
          <Text style={styles.viewAllText}>
            View All ({transactions.length}) ›
          </Text>
        </Pressable>
      </View>

      {/* Empty State */}
      {transactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>No Transactions Yet</Text>
          <Text style={styles.emptySub}>
            New bank SMS or manual entries will appear here automatically.
          </Text>
        </View>
      ) : null}

      {/* High-Fidelity Pro Transaction Stream */}
      <View style={styles.txStream}>
        {transactions.map((tx) => {
          const isCredit = tx.direction === 'credit';
          const amountSign = isCredit ? '+ ' : '- ';
          const amountColor = isCredit ? '#00E676' : '#FFFFFF';

          return (
            <Pressable
              key={tx.id}
              onPress={() => onPressTransaction?.(tx)}
              style={({ pressed }) => [
                styles.txCard,
                pressed && styles.txCardPressed,
              ]}>
              <View style={styles.txMain}>
                {/* 1. Category 3D Icon Container */}
                <View
                  style={[
                    styles.iconBox,
                    isCredit ? styles.iconBoxCredit : styles.iconBoxDebit,
                  ]}>
                  <Text style={styles.categoryEmoji}>{tx.icon}</Text>
                </View>

                {/* 2. Merchant & Category/Date Meta */}
                <View style={styles.txMeta}>
                  <Text style={styles.merchantName} numberOfLines={1}>
                    {tx.merchant}
                  </Text>
                  <View style={styles.subMetaRow}>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryPillText} numberOfLines={1}>
                        {tx.category}
                      </Text>
                    </View>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.dateText}>{tx.dateStr}</Text>
                  </View>
                </View>

                {/* 3. Amount Section */}
                <View style={styles.amountSection}>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: amountColor },
                      isCredit && styles.creditGlow,
                    ]}>
                    {amountSign}
                    {formatPaise(tx.amountPaise)}
                  </Text>
                  <Text style={styles.tapChevron}>›</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerPulseDot: {
    fontSize: 9,
    color: '#00F0FF',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 1.2,
  },
  viewAllBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00F0FF',
  },
  emptyCard: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: 12,
    color: '#7E8B9F',
    textAlign: 'center',
  },
  txStream: {
    gap: 10,
  },
  txCard: {
    backgroundColor: '#0E131E',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  txCardPressed: {
    backgroundColor: '#151C2A',
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  txMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconBoxDebit: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconBoxCredit: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.35)',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  txMeta: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 8,
    gap: 4,
  },
  merchantName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 130,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  dotSeparator: {
    fontSize: 10,
    color: '#55637A',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#65738E',
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  creditGlow: {
    textShadowColor: 'rgba(0, 230, 118, 0.45)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  tapChevron: {
    fontSize: 16,
    fontWeight: '700',
    color: '#55637A',
  },
});
