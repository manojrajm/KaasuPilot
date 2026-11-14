import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Loan } from '@/domain/types';
import { formatPaise } from '@/domain/money/format';

interface LoanCardProps {
  loan: Loan;
  onViewSchedule: (loan: Loan) => void;
  onOpenPrepay: (loan: Loan) => void;
  onMarkPaid: (loanId: string) => void;
  onEdit?: (loan: Loan) => void;
}

export function LoanCard({
  loan,
  onViewSchedule,
  onOpenPrepay,
  onMarkPaid,
  onEdit,
}: LoanCardProps) {
  const isPaidOff = loan.balancePaise <= 0 || loan.status === 'closed';
  const progressRatio = Math.min(1, loan.monthsPaid / loan.tenureMonths);
  const progressPercent = Math.round(progressRatio * 100);
  const ratePercent = (loan.annualRateBps / 100).toFixed(2);

  const isHome = loan.type === 'home';
  const icon = isHome ? '🏠' : loan.type === 'auto' ? '🚗' : loan.type === 'gold' ? '🪙' : '💳';

  return (
    <View style={[styles.card, isPaidOff && styles.cardPaidOff]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.loanName} numberOfLines={1}>
              {loan.name}
            </Text>
            <Text style={styles.lenderText}>
              {loan.lender} • Due on {loan.dueDayOfMonth}th
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.rateBadge}>
            <Text style={styles.rateBadgeText}>{ratePercent}% p.a.</Text>
          </View>
          {onEdit ? (
            <Pressable
              onPress={() => onEdit(loan)}
              hitSlop={8}
              style={({ pressed }) => [styles.editPill, pressed && styles.btnPressed]}>
              <Text style={styles.editPillText}>✏️</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Hero Financial Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>REMAINING PRINCIPAL</Text>
          <Text style={[styles.metricValue, isPaidOff && styles.metricValuePaid]}>
            {isPaidOff ? 'PAID OFF 🎉' : formatPaise(loan.balancePaise)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricCol}>
          <Text style={styles.metricLabel}>MONTHLY EMI</Text>
          <Text style={styles.emiValue}>{formatPaise(loan.emiPaise)}</Text>
        </View>
      </View>

      {/* Progress Bar & Tenure Counter */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressText}>
            Tenure: {loan.monthsPaid} of {loan.tenureMonths} months paid
          </Text>
          <Text style={styles.progressPercentText}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
              isPaidOff && styles.progressBarFillPaid,
            ]}
          />
        </View>
      </View>

      {/* Prepayment Tag if any */}
      {loan.prepaymentsPaise && loan.prepaymentsPaise > 0 ? (
        <View style={styles.prepayTelemetryRow}>
          <Text style={styles.prepayTelemetryText}>
            ⚡ Total Prepaid Locally: {formatPaise(loan.prepaymentsPaise)}
          </Text>
        </View>
      ) : null}

      {/* Action Buttons Row */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onViewSchedule(loan)}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
          <Text style={styles.secondaryBtnText}>📋 Schedule</Text>
        </Pressable>

        <Pressable
          onPress={() => onOpenPrepay(loan)}
          style={({ pressed }) => [styles.prepayBtn, pressed && styles.btnPressed]}>
          <Text style={styles.prepayBtnText}>⚡ Prepay Simulator</Text>
        </Pressable>

        {!isPaidOff && (
          <Pressable
            onPress={() => onMarkPaid(loan.id)}
            style={({ pressed }) => [styles.markPaidBtn, pressed && styles.btnPressed]}>
            <Text style={styles.markPaidBtnText}>✓ Paid</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D111A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  cardPaidOff: {
    borderColor: 'rgba(0, 230, 118, 0.3)',
    backgroundColor: 'rgba(13, 26, 20, 0.6)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconText: {
    fontSize: 20,
  },
  metaBox: {
    gap: 3,
    flex: 1,
  },
  loanName: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  lenderText: {
    fontSize: 11,
    color: '#8E9BB0',
  },
  rateBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  rateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00F0FF',
  },
  editPill: {
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  editPillText: {
    fontSize: 11,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#07090E',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricCol: {
    flex: 1,
    gap: 3,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricValuePaid: {
    color: '#00E676',
  },
  emiValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFB800',
  },
  progressContainer: {
    gap: 6,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    color: '#8E9BB0',
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFB800',
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFB800',
    borderRadius: 4,
  },
  progressBarFillPaid: {
    backgroundColor: '#00E676',
  },
  prepayTelemetryRow: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  prepayTelemetryText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00E676',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  prepayBtn: {
    flex: 1.4,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFB800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepayBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFB800',
  },
  markPaidBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markPaidBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#00E676',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
