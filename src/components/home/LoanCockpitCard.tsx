import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { formatPaise } from '@/domain/money/format';
import { NextEmiInfo } from '@/hooks/useHomeDashboard';

interface LoanCockpitCardProps {
  nextEmi: NextEmiInfo;
  onPayEmi: () => void;
  onViewLoanDetail?: () => void;
  onViewLoanHealth?: () => void;
}

export function LoanCockpitCard({
  nextEmi,
  onPayEmi,
  onViewLoanDetail,
  onViewLoanHealth,
}: LoanCockpitCardProps) {
  const payButtonScale = useSharedValue(1);

  const animatedPayBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: payButtonScale.value }],
  }));

  const progressPercent = Math.min(
    100,
    Math.round((nextEmi.monthsPaid / Math.max(1, nextEmi.totalMonths)) * 100)
  );

  const handlePayPress = () => {
    payButtonScale.value = withSpring(0.92, {}, () => {
      payButtonScale.value = withSpring(1);
    });
    onPayEmi();
  };

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleWithBadge}>
          <Text style={styles.sectionTitle}>NEXT EMI & LOAN HEALTH</Text>
          <View style={styles.activeTag}>
            <View style={styles.greenPulse} />
            <Text style={styles.activeTagText}>ACTIVE COCKPIT</Text>
          </View>
        </View>

        <Pressable onPress={onViewLoanHealth} style={styles.healthScoreBadge}>
          <View style={styles.healthCircle}>
            <Text style={styles.healthScoreNumber}>{nextEmi.healthScore}</Text>
          </View>
          <View style={styles.healthTextContainer}>
            <Text style={styles.healthLabel}>LOAN HEALTH</Text>
            <Text style={styles.healthStatus}>Good (72/100) ›</Text>
          </View>
        </Pressable>
      </View>

      {/* Main Loan Details Row */}
      <Pressable onPress={onViewLoanDetail} style={styles.loanInfoBox}>
        <View style={styles.loanMetaLeft}>
          <View style={styles.carIconBox}>
            <Text style={styles.carIconText}>🚗</Text>
          </View>
          <View>
            <Text style={styles.loanNameText}>{nextEmi.loanName}</Text>
            <Text style={styles.lenderText}>{nextEmi.lender} • Auto Debit</Text>
          </View>
        </View>

        <View style={styles.loanAmountRight}>
          <Text style={styles.emiAmount}>{formatPaise(nextEmi.emiPaise)}</Text>
          <View
            style={[
              styles.dueBadge,
              nextEmi.isPaid && styles.paidBadge,
            ]}>
            <Text
              style={[
                styles.dueBadgeText,
                nextEmi.isPaid && styles.paidBadgeText,
              ]}>
              {nextEmi.isPaid ? '✓ PAID' : `Due ${nextEmi.dueDate} (${nextEmi.daysRemaining}d)`}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Tenure Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressLabelsRow}>
          <Text style={styles.progressLabelText}>
            Tenure: {nextEmi.monthsPaid} of {nextEmi.totalMonths} months
          </Text>
          <Text style={styles.progressPercentageText}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
      </View>

      {/* Action Footer */}
      <View style={styles.actionsFooter}>
        <Pressable onPress={onViewLoanDetail} style={styles.secondaryActionBtn}>
          <Text style={styles.secondaryActionText}>Schedule & Prepay ›</Text>
        </Pressable>

        <Animated.View style={animatedPayBtnStyle}>
          <Pressable
            disabled={nextEmi.isPaid}
            onPress={handlePayPress}
            style={[
              styles.payButton,
              nextEmi.isPaid && styles.payButtonDisabled,
            ]}>
            <Text style={styles.payButtonText}>
              {nextEmi.isPaid ? '✓ Marked as Paid' : '⚡ Mark Paid'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0D111A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithBadge: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00E676',
    letterSpacing: 0.8,
  },
  healthScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  healthCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00F0FF',
  },
  healthTextContainer: {
    gap: 1,
  },
  healthLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#8E9BB0',
    letterSpacing: 0.8,
  },
  healthStatus: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#00F0FF',
  },
  loanInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  loanMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  carIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carIconText: {
    fontSize: 20,
  },
  loanNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lenderText: {
    fontSize: 11.5,
    color: '#8E9BB0',
    marginTop: 2,
  },
  loanAmountRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  emiAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dueBadge: {
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.3)',
  },
  paidBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFB300',
    letterSpacing: 0.5,
  },
  paidBadgeText: {
    color: '#00E676',
  },
  progressContainer: {
    gap: 6,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: 11,
    color: '#8E9BB0',
    fontWeight: '500',
  },
  progressPercentageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00F0FF',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00F0FF',
    borderRadius: 3,
  },
  actionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  secondaryActionBtn: {
    paddingVertical: 6,
  },
  secondaryActionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#00F0FF',
  },
  payButton: {
    backgroundColor: 'rgba(0, 240, 255, 0.14)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  payButtonDisabled: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.4)',
  },
  payButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
