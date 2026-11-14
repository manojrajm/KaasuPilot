import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TransactionCard } from '@/components/transaction/TransactionCard';
import { formatPaise } from '@/domain/money/format';
import { Account, Transaction } from '@/domain/types';

interface DailyTransactionGroupProps {
  dateTitle: string;
  transactions: Transaction[];
  accountsById: Record<string, Account>;
  onPressTransaction: (tx: Transaction) => void;
}

export function DailyTransactionGroup({
  dateTitle,
  transactions,
  accountsById,
  onPressTransaction,
}: DailyTransactionGroupProps) {
  // Aggregate daily total spending and income
  const { totalExpensePaise, totalIncomePaise, netPaise } = useMemo(() => {
    let expense = 0;
    let income = 0;
    transactions.forEach((tx) => {
      if (tx.direction === 'debit') {
        expense += tx.amountPaise;
      } else {
        income += tx.amountPaise;
      }
    });
    return {
      totalExpensePaise: expense,
      totalIncomePaise: income,
      netPaise: income - expense,
    };
  }, [transactions]);

  return (
    <View style={styles.groupContainer}>
      {/* Daily Header with Day Total Pill */}
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <View style={styles.dateLabelRow}>
            <Text style={styles.calIcon}>📅</Text>
            <Text style={styles.dateTitle}>{dateTitle}</Text>
          </View>
          <Text style={styles.txnCountSub}>{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}</Text>
        </View>

        {/* Daily Total Badge Pill */}
        <View style={styles.headerRight}>
          <View
            style={[
              styles.dayTotalBadge,
              netPaise < 0
                ? styles.dayTotalBadgeDebit
                : netPaise > 0
                ? styles.dayTotalBadgeCredit
                : styles.dayTotalBadgeNeutral,
            ]}>
            <Text
              style={[
                styles.dayTotalText,
                netPaise < 0
                  ? styles.dayTotalTextDebit
                  : netPaise > 0
                  ? styles.dayTotalTextCredit
                  : styles.dayTotalTextNeutral,
              ]}>
              {netPaise < 0
                ? `💸 -${formatPaise(totalExpensePaise)}`
                : netPaise > 0
                ? `💰 +${formatPaise(totalIncomePaise)}`
                : '₹ 0'}
            </Text>
          </View>

          {/* Sub-breakdown if both income & expenses occurred on the same day */}
          {totalExpensePaise > 0 && totalIncomePaise > 0 ? (
            <Text style={styles.dualSubText}>
              +{formatPaise(totalIncomePaise)} In • -{formatPaise(totalExpensePaise)} Out
            </Text>
          ) : null}
        </View>
      </View>

      {/* Transaction Items */}
      <View style={styles.cardList}>
        {transactions.map((tx) => (
          <TransactionCard
            key={tx.id}
            transaction={tx}
            accountName={accountsById[tx.accountId]?.name}
            onPress={() => onPressTransaction(tx)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupContainer: {
    gap: 8,
    marginBottom: 6,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0A0D14',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    gap: 2,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calIcon: {
    fontSize: 12,
  },
  dateTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  txnCountSub: {
    fontSize: 9.5,
    color: '#65738E',
    fontWeight: '600',
    marginLeft: 18,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  dayTotalBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayTotalBadgeDebit: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderColor: 'rgba(255, 59, 48, 0.4)',
  },
  dayTotalBadgeCredit: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  dayTotalBadgeNeutral: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dayTotalText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  dayTotalTextDebit: {
    color: '#FF6B61',
  },
  dayTotalTextCredit: {
    color: '#00E676',
  },
  dayTotalTextNeutral: {
    color: '#8A96AD',
  },
  dualSubText: {
    fontSize: 8.5,
    color: '#65738E',
    fontWeight: '600',
  },
  cardList: {
    gap: 8,
  },
});
