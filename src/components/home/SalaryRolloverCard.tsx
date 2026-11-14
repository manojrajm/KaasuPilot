import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { formatPaise } from '@/domain/money/format';
import { Paise } from '@/domain/money/paise';

interface SalaryRolloverCardProps {
  previousBalancePaise: Paise;
  onCarryForward: () => void;
  onMoveToSavings: () => void;
}

export function SalaryRolloverCard({
  previousBalancePaise,
  onCarryForward,
  onMoveToSavings,
}: SalaryRolloverCardProps) {
  const formattedAmount = formatPaise(previousBalancePaise);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Text style={styles.sparkleIcon}>✨</Text>
          <Text style={styles.badgeText}>SALARY CYCLE ROLLOVER</Text>
        </View>
        <Text style={styles.surplusTag}>SURPLUS DETECTED</Text>
      </View>

      <View style={styles.contentBody}>
        <Text style={styles.title}>
          Last cycle you had <Text style={styles.amountHighlight}>{formattedAmount}</Text> remaining.
        </Text>
        <Text style={styles.subtitle}>
          How would you like to allocate this unused surplus for your financial trajectory?
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onCarryForward}
          style={({ pressed }) => [styles.carryBtn, pressed && styles.btnPressed]}>
          <Text style={styles.carryBtnIcon}>🔄</Text>
          <Text style={styles.carryBtnText}>Add to This Month</Text>
        </Pressable>

        <Pressable
          onPress={onMoveToSavings}
          style={({ pressed }) => [styles.savingsBtn, pressed && styles.btnPressed]}>
          <Text style={styles.savingsBtnIcon}>🏦</Text>
          <Text style={styles.savingsBtnText}>Move to Savings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.35)',
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkleIcon: { fontSize: 13 },
  badgeText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  surplusTag: {
    color: '#00E676',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  contentBody: {
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  amountHighlight: {
    color: '#00E676',
    fontWeight: '900',
  },
  subtitle: {
    color: '#8A96AD',
    fontSize: 12,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  carryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 12,
    paddingVertical: 10,
  },
  carryBtnIcon: { fontSize: 13 },
  carryBtnText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '800',
  },
  savingsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 10,
  },
  savingsBtnIcon: { fontSize: 13 },
  savingsBtnText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});