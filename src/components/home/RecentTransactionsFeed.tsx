import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { formatPaise } from '@/domain/money/format';
import { TransactionItem } from '@/hooks/useHomeDashboard';

interface RecentTransactionsFeedProps {
  transactions: TransactionItem[];
  smsPendingCount: number;
  onPressSmsInbox?: () => void;
  onPressViewAll?: () => void;
  onPressTransaction?: (tx: TransactionItem) => void;
}

export function RecentTransactionsFeed({
  transactions,
  smsPendingCount,
  onPressSmsInbox,
  onPressViewAll,
  onPressTransaction,
}: RecentTransactionsFeedProps) {
  return (
    <View style={styles.container}>
      {/* SMS Queue Review Banner - Always accessible so user can open SMS inbox and test/review anytime */}
      <Pressable onPress={onPressSmsInbox} style={[styles.smsReviewBanner, smsPendingCount > 0 && styles.smsBannerActive]}>
        <View style={styles.smsBannerLeft}>
          <View style={[styles.smsPulsingDot, smsPendingCount > 0 ? styles.smsActiveDot : styles.smsIdleDot]} />
          <Text style={[styles.smsBannerTitle, smsPendingCount > 0 && styles.smsBannerTitleActive]}>
            {smsPendingCount > 0
              ? `${smsPendingCount} Bank SMS Pending Review`
              : 'Bank SMS Intelligence & Auto-Capture'}
          </Text>
        </View>
        <View style={[styles.reviewPill, smsPendingCount > 0 && styles.reviewPillActive]}>
          <Text style={[styles.reviewPillText, smsPendingCount > 0 && styles.reviewPillTextActive]}>
            {smsPendingCount > 0 ? 'Review ›' : 'Open Inbox ›'}
          </Text>
        </View>
      </Pressable>

      {/* Header */}
      <View style={styles.feedHeader}>
        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        <Pressable onPress={onPressViewAll}>
          <Text style={styles.viewAllText}>View All ({transactions.length}) ›</Text>
        </Pressable>
      </View>

      {/* Transactions List */}
      <View style={styles.txList}>
        {transactions.map((tx) => {
          const isCredit = tx.direction === 'credit';
          const amountSign = isCredit ? '+ ' : '- ';
          const amountColor = isCredit ? '#00E676' : '#FFFFFF';

          return (
            <Pressable
              key={tx.id}
              onPress={() => onPressTransaction?.(tx)}
              style={styles.txRow}>
              <View style={styles.txLeft}>
                <View style={styles.iconContainer}>
                  <Text style={styles.categoryIcon}>{tx.icon}</Text>
                </View>

                <View style={styles.metaContainer}>
                  <Text style={styles.merchantName} numberOfLines={1}>
                    {tx.merchant}
                  </Text>
                  <Text style={styles.categoryAndDate}>
                    {tx.category} • {tx.dateStr}
                  </Text>
                </View>
              </View>

              <View style={styles.amountContainer}>
                <Text
                  style={[
                    styles.txAmount,
                    { color: amountColor },
                    isCredit && styles.creditGlow,
                  ]}>
                  {amountSign}
                  {formatPaise(tx.amountPaise)}
                </Text>
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
    gap: 14,
  },
  smsReviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  smsBannerActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  smsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  smsPulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  smsActiveDot: {
    backgroundColor: '#FFD700',
  },
  smsIdleDot: {
    backgroundColor: '#00F0FF',
  },
  smsBannerTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#00F0FF',
  },
  smsBannerTitleActive: {
    color: '#FFD700',
  },
  reviewPill: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  reviewPillActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  reviewPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00F0FF',
  },
  reviewPillTextActive: {
    color: '#0A0D14',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  viewAllText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#00F0FF',
  },
  txList: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    fontSize: 18,
  },
  metaContainer: {
    gap: 3,
    flex: 1,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryAndDate: {
    fontSize: 11,
    color: '#8E9BB0',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  creditGlow: {
    textShadowColor: 'rgba(0, 230, 118, 0.4)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
});
