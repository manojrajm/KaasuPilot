import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Transaction } from '@/domain/types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '@/data/seed/defaultCategories';
import { Category3DIcon } from '@/components/ui/Category3DIcon';
import { formatPaise } from '@/domain/money/format';

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
  onDelete?: () => void;
}

export function TransactionCard({ transaction, onPress, onDelete }: TransactionCardProps) {
  const category = DEFAULT_CATEGORIES.find((c) => c.id === transaction.categoryId) || DEFAULT_CATEGORIES[0];
  const account = DEFAULT_ACCOUNTS.find((a) => a.id === transaction.accountId);

  const isCredit = transaction.direction === 'credit';
  const amountPrefix = isCredit ? '+ ' : '- ';
  const amountColor = isCredit ? '#00E676' : '#FFFFFF';

  // Format date readable
  const d = new Date(transaction.txnDate);
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardContainer, pressed && styles.cardPressed]}>
      <View style={styles.leftRow}>
        {/* 3D Action Icon */}
        <Category3DIcon
          emoji={category.emoji}
          color={category.color}
          gradientColors={category.gradientColors}
          size={42}
        />

        <View style={styles.metaContainer}>
          <Text style={styles.merchantText} numberOfLines={1}>
            {transaction.merchant}
          </Text>
          <View style={styles.subInfoRow}>
            <Text style={styles.categoryText}>{category.name}</Text>
            {account ? (
              <>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.accountText}>{account.name}</Text>
              </>
            ) : null}
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
          {transaction.note ? (
            <Text style={styles.noteText} numberOfLines={1}>
              {transaction.note}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightAmountContainer}>
        <Text
          style={[
            styles.amountText,
            { color: amountColor },
            isCredit && styles.creditGlow,
          ]}>
          {amountPrefix}
          {formatPaise(transaction.amountPaise)}
        </Text>

        {transaction.taxTag ? (
          <View style={styles.taxBadge}>
            <Text style={styles.taxBadgeText}>{transaction.taxTag}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 20, 32, 0.85)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 8,
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  metaContainer: {
    flex: 1,
    gap: 3,
  },
  merchantText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  categoryText: {
    fontSize: 11.5,
    color: '#8E9BB0',
    fontWeight: '500',
  },
  dotSeparator: {
    fontSize: 10,
    color: '#65738E',
  },
  accountText: {
    fontSize: 11.5,
    color: '#8E9BB0',
  },
  timeText: {
    fontSize: 11,
    color: '#65738E',
  },
  noteText: {
    fontSize: 11,
    color: '#65738E',
    fontStyle: 'italic',
    marginTop: 1,
  },
  rightAmountContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  creditGlow: {
    textShadowColor: 'rgba(0, 230, 118, 0.45)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  taxBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  taxBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 0.5,
  },
});
