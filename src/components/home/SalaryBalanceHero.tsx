import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BankCard } from '@/components/cards/BankCard';
import { cardPropsFromAccount } from '@/components/cards/cardProps';
import { Spacing } from '@/constants/theme';
import { formatPaise } from '@/domain/money/format';
import { Paise } from '@/domain/money/paise';
import { Account } from '@/domain/types';

interface SalaryBalanceHeroProps {
  salaryCard: Account | null;
  userName?: string;
  availablePaise: Paise;
  salaryPaise: Paise;
  extraIncomePaise: Paise;
  spentPaise: Paise;
  carriedInPaise: Paise;
  usedPercent: number;
  isOverspent: boolean;
  daysToNextSalary: number;
  savingsPaise: Paise;
  nextSalaryDateStr?: string;
  width?: number;
}

export function SalaryBalanceHero({
  salaryCard,
  userName,
  availablePaise,
  salaryPaise,
  extraIncomePaise,
  spentPaise,
  carriedInPaise,
  usedPercent,
  isOverspent,
  daysToNextSalary,
  savingsPaise,
  nextSalaryDateStr,
  width = 340,
}: SalaryBalanceHeroProps) {
  const router = useRouter();

  const formattedAvailable = formatPaise(availablePaise);
  const clampedProgress = Math.min(100, Math.max(0, usedPercent));
  const isHighSpend = usedPercent > 80;
  const displayName = (userName?.trim() || salaryCard?.holderName || 'PILOT').toUpperCase();

  return (
    <View style={[styles.container, { width }]}>
      {/* 1. Main Visual Card (Realistic Bank Card or Titanium Cyber Plate) */}
      {salaryCard ? (
        <BankCard
          {...cardPropsFromAccount(salaryCard)}
          holderName={displayName}
          centerLabel="AVAILABLE BALANCE"
          centerValue={formattedAvailable}
          centerValueColor={isOverspent ? '#FF6B61' : undefined}
          width={width}
          onPress={() => router.push({ pathname: '/cards/[id]', params: { id: salaryCard.id } })}
        />
      ) : (
        <View style={[styles.defaultCard, { width, height: width / 1.586 }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cyberDot} />
              <Text style={styles.cyberBadgeText}>LOCAL CYBER VAULT</Text>
            </View>
            <Pressable
              onPress={() => router.push('/profile')}
              hitSlop={8}
              style={styles.assignCardBtn}>
              <Text style={styles.assignCardText}>Link Card ›</Text>
            </Pressable>
          </View>

          <View style={styles.centerContent}>
            <Text style={styles.centerLabel}>AVAILABLE BALANCE</Text>
            <Text style={[styles.centerValue, isOverspent && styles.overspentText]}>
              {formattedAvailable}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.cardHolderUserText}>{displayName}</Text>
            <Text style={styles.footerNote}>
              {salaryPaise > 0
                ? 'Calculated from salary cycle & expenses'
                : 'Set monthly salary in Profile to activate engine'}
            </Text>
          </View>
        </View>
      )}

      {/* 2. Salary Setup Call-to-Action if salary is not configured */}
      {salaryPaise <= 0 ? (
        <Pressable
          onPress={() => router.push('/profile')}
          style={styles.setupSalaryBanner}>
          <Text style={styles.setupSalaryIcon}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.setupSalaryTitle}>Set Your Monthly Salary</Text>
            <Text style={styles.setupSalarySub}>
              Activate automatic monthly salary crediting & cycle telemetry
            </Text>
          </View>
          <Text style={styles.setupSalaryArrow}>›</Text>
        </Pressable>
      ) : null}

      {/* 3. Cycle Spending Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>CYCLE BUDGET CONSUMPTION</Text>
          <Text
            style={[
              styles.progressPercent,
              isOverspent
                ? styles.progressOverspent
                : isHighSpend
                ? styles.progressWarning
                : styles.progressNormal,
            ]}>
            {isOverspent ? 'EXCEEDED' : `${Math.round(usedPercent)}% USED`}
          </Text>
        </View>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${clampedProgress}%` },
              isOverspent
                ? styles.fillDanger
                : isHighSpend
                ? styles.fillWarning
                : styles.fillNormal,
            ]}
          />
        </View>
      </View>

      {/* 4. Financial Telemetry Breakdown Row */}
      <View style={styles.telemetryRow}>
        <View style={styles.telemetryPill}>
          <Text style={styles.pillLabel}>SALARY</Text>
          <Text style={styles.pillValue}>{formatPaise(salaryPaise)}</Text>
        </View>

        {extraIncomePaise > 0 ? (
          <View style={styles.telemetryPill}>
            <Text style={styles.pillLabel}>EXTRA INFLOW</Text>
            <Text style={[styles.pillValue, styles.extraIncomeText]}>
              +{formatPaise(extraIncomePaise)}
            </Text>
          </View>
        ) : null}

        {carriedInPaise > 0 ? (
          <View style={styles.telemetryPill}>
            <Text style={styles.pillLabel}>CARRIED</Text>
            <Text style={[styles.pillValue, styles.carriedText]}>
              +{formatPaise(carriedInPaise)}
            </Text>
          </View>
        ) : null}

        <View style={styles.telemetryPill}>
          <Text style={styles.pillLabel}>SPENT</Text>
          <Text style={[styles.pillValue, styles.spentText]}>
            {formatPaise(spentPaise)}
          </Text>
        </View>
      </View>

      {/* 5. Sub-Row: Next Salary & Accumulated Savings */}
      <View style={styles.subRow}>
        <View style={styles.nextSalaryBox}>
          <Text style={styles.nextSalaryIcon}>🗓️</Text>
          <Text style={styles.nextSalaryText}>
            Next salary cycle in <Text style={styles.boldText}>{daysToNextSalary} days</Text>
            {nextSalaryDateStr ? ` (${nextSalaryDateStr})` : ''}
          </Text>
        </View>

        {savingsPaise > 0 ? (
          <View style={styles.savingsPill}>
            <Text style={styles.savingsIcon}>🏦</Text>
            <Text style={styles.savingsText}>Vault Savings: {formatPaise(savingsPaise)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
    alignItems: 'center',
  },
  defaultCard: {
    backgroundColor: '#0D111A',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    padding: Spacing.four,
    justifyContent: 'space-between',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cyberDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00F0FF',
  },
  cyberBadgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  assignCardBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  assignCardText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '700',
  },
  centerContent: {
    alignItems: 'center',
    gap: 4,
  },
  centerLabel: {
    color: '#8A96AD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  centerValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  overspentText: {
    color: '#FF6B61',
  },
  cardFooter: {
    alignItems: 'center',
  },
  cardHolderUserText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  footerNote: {
    color: '#5A667D',
    fontSize: 10,
    fontWeight: '600',
  },
  setupSalaryBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 14,
    padding: Spacing.three,
  },
  setupSalaryIcon: { fontSize: 20 },
  setupSalaryTitle: { color: '#FFD700', fontSize: 13, fontWeight: '800' },
  setupSalarySub: { color: '#8A96AD', fontSize: 10.5, marginTop: 1 },
  setupSalaryArrow: { color: '#FFD700', fontSize: 18, fontWeight: '700' },
  progressContainer: {
    width: '100%',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: Spacing.three,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#65738E',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressNormal: { color: '#00E676' },
  progressWarning: { color: '#FFB800' },
  progressOverspent: { color: '#FF6B61' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  fillNormal: { backgroundColor: '#00E676' },
  fillWarning: { backgroundColor: '#FFB800' },
  fillDanger: { backgroundColor: '#FF6B61' },
  telemetryRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  telemetryPill: {
    flex: 1,
    minWidth: 70,
    backgroundColor: '#0D111A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
  },
  pillLabel: {
    color: '#65738E',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pillValue: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  extraIncomeText: { color: '#00E676' },
  carriedText: { color: '#00F0FF' },
  spentText: { color: '#FF6B61' },
  subRow: {
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  nextSalaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nextSalaryIcon: { fontSize: 13 },
  nextSalaryText: {
    color: '#8A96AD',
    fontSize: 11.5,
    fontWeight: '500',
  },
  boldText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  savingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  savingsIcon: { fontSize: 12 },
  savingsText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
  },
});