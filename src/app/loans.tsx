import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useLoans } from '@/hooks/useLoans';
import { LoanCard } from '@/components/loans/LoanCard';
import { DueDatesCalendar } from '@/components/loans/DueDatesCalendar';
import { LoanHealthScoreCard } from '@/components/loans/LoanHealthScoreCard';
import { PrepaymentSimulatorModal } from '@/components/loans/PrepaymentSimulatorModal';
import { AmortisationModal } from '@/components/loans/AmortisationModal';
import { TeslaHudModal } from '@/components/ui/TeslaHudModal';
import { simulateDebtPayoff } from '@/domain/loans/debtPayoff';
import { formatPaise } from '@/domain/money/format';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Loan, PrepaymentStrategy } from '@/domain/types';

export default function LoansScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();

  const {
    loans,
    healthBreakdown,
    calendarEvents,
    selectedYear,
    selectedMonthIndex,
    goToNextMonth,
    goToPrevMonth,
    markPaid,
    recordPrepayment,
    markCalendarEventPaid,
  } = useLoans();

  // View Mode: 'list' (Active Loans) vs 'calendar' (Due Dates Matrix)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Modals state
  const [selectedLoanForPrepay, setSelectedLoanForPrepay] = useState<Loan | null>(null);
  const [selectedLoanForSchedule, setSelectedLoanForSchedule] = useState<Loan | null>(null);
  const [hudModal, setHudModal] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    icon?: string;
    badge?: string;
    accentColor?: string;
  }>({
    visible: false,
    title: '',
  });

  // Entrance animation
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

  // Aggregate metrics
  const activeLoans = loans.filter((l) => l.status === 'active' && l.balancePaise > 0);
  const totalDebtPaise = activeLoans.reduce((sum, l) => sum + l.balancePaise, 0);
  const totalMonthlyEmiPaise = activeLoans.reduce((sum, l) => sum + l.emiPaise, 0);

  // Avalanche vs Snowball simulation
  const payoffComparison = useMemo(() => {
    return simulateDebtPayoff(loans, 1000000); // ₹10,000 extra monthly
  }, [loans]);

  const handleMarkLoanPaid = async (loanId: string) => {
    await markPaid(loanId);
    setHudModal({
      visible: true,
      title: 'EMI Installment Recorded',
      subtitle: 'Monthly principal and interest updated. Next installment advanced.',
      icon: '✓',
      badge: 'VAULT RECONCILIATION COMPLETE',
      accentColor: '#00E676',
    });
  };

  const handleApplyPrepayment = async (
    loanId: string,
    lumpSumPaise: number,
    strategy: PrepaymentStrategy
  ) => {
    await recordPrepayment(loanId, lumpSumPaise, strategy);
    setHudModal({
      visible: true,
      title: 'Prepayment Applied',
      subtitle: `Recorded ${formatPaise(lumpSumPaise)} extra payment locally. Loan schedule re-optimized.`,
      icon: '⚡',
      badge: 'PREPAYMENT EXECUTED',
      accentColor: '#FFB800',
    });
  };

  const handleCalendarMarkPaid = (eventId: string, sourceId: string) => {
    markCalendarEventPaid(eventId);
    if (sourceId.startsWith('loan_')) {
      markPaid(sourceId);
    }
    setHudModal({
      visible: true,
      title: 'Payment Reconciled',
      subtitle: 'Due date marked as paid on the calendar matrix and reconciled locally.',
      icon: '✓',
      badge: 'DUE DATE RECONCILED',
      accentColor: '#00E676',
    });
  };

  return (
    <View style={styles.screenContainer}>
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
          {/* 1. Header Bar */}
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerTitle}>LOAN COCKPIT</Text>
              <View style={styles.localVaultRow}>
                <View style={styles.greenPulse} />
                <Text style={styles.localVaultText}>
                  AMORTISATION & DUE INTELLIGENCE • ON-DEVICE
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/')}
              style={styles.homeBackBtn}
              hitSlop={8}>
              <Text style={styles.homeBackText}>‹ Dashboard</Text>
            </Pressable>
          </View>

          {/* 2. Tesla View Switcher: List vs Calendar Matrix */}
          <View style={styles.viewSwitcherBar}>
            <Pressable
              onPress={() => setViewMode('list')}
              style={[
                styles.switcherTab,
                viewMode === 'list' && styles.switcherTabActive,
              ]}>
              <Text
                style={[
                  styles.switcherTabText,
                  viewMode === 'list' && styles.switcherTabTextActive,
                ]}>
                📋 Active Loans ({activeLoans.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setViewMode('calendar')}
              style={[
                styles.switcherTab,
                viewMode === 'calendar' && styles.switcherTabActiveCalendar,
              ]}>
              <Text
                style={[
                  styles.switcherTabText,
                  viewMode === 'calendar' && styles.switcherTabTextActiveCalendar,
                ]}>
                📅 Due Dates Calendar ({calendarEvents.length})
              </Text>
            </Pressable>
          </View>

          {/* 3. Conditional Content: List vs Calendar */}
          {viewMode === 'calendar' ? (
            /* ======================================================== */
            /* CALENDAR VIEW: Interactive Due Dates Matrix              */
            /* ======================================================== */
            <DueDatesCalendar
              events={calendarEvents}
              selectedYear={selectedYear}
              selectedMonthIndex={selectedMonthIndex}
              onPrevMonth={goToPrevMonth}
              onNextMonth={goToNextMonth}
              onMarkPaid={handleCalendarMarkPaid}
            />
          ) : (
            /* ======================================================== */
            /* LIST VIEW: Loan Cards, Health Score & Debt Payoff        */
            /* ======================================================== */
            <>
              {/* Loan Health Score Card */}
              <LoanHealthScoreCard health={healthBreakdown} />

              {/* Aggregated Debt Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>TOTAL DEBT OUTSTANDING</Text>
                  <Text style={styles.summaryValue}>
                    {formatPaise(totalDebtPaise)}
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>MONTHLY EMI COMMITTED</Text>
                  <Text style={[styles.summaryValue, styles.emiSummaryValue]}>
                    {formatPaise(totalMonthlyEmiPaise)}
                  </Text>
                </View>
              </View>

              {/* Active Loans List */}
              <View style={styles.loansSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>REGISTERED LOANS</Text>
                  <Text style={styles.sectionSubCount}>
                    {activeLoans.length} Active Accounts
                  </Text>
                </View>

                {loans.map((loan) => (
                  <LoanCard
                    key={loan.id}
                    loan={loan}
                    onViewSchedule={(l) => setSelectedLoanForSchedule(l)}
                    onOpenPrepay={(l) => setSelectedLoanForPrepay(l)}
                    onMarkPaid={handleMarkLoanPaid}
                  />
                ))}
              </View>

              {/* Avalanche vs Snowball Power Tool Dock */}
              <View style={styles.payoffCard}>
                <View style={styles.payoffHeader}>
                  <Text style={styles.payoffBadge}>🚀 DEBT ACCELERATOR</Text>
                  <Text style={styles.payoffTitle}>
                    Snowball vs. Avalanche Comparison
                  </Text>
                </View>

                <View style={styles.payoffCompareRow}>
                  <View style={styles.payoffCol}>
                    <Text style={styles.payoffColLabel}>AVALANCHE (MAX SAVINGS)</Text>
                    <Text style={styles.payoffSavingsText}>
                      Save {formatPaise(payoffComparison.interestSavedWithAvalanchePaise)}
                    </Text>
                    <Text style={styles.payoffColSub}>
                      Prioritizes highest interest rate (9.1% Nexon first)
                    </Text>
                  </View>

                  <View style={styles.payoffDivider} />

                  <View style={styles.payoffCol}>
                    <Text style={styles.payoffColLabel}>SNOWBALL (QUICK WINS)</Text>
                    <Text style={styles.payoffSnowballText}>
                      Fastest single payoff
                    </Text>
                    <Text style={styles.payoffColSub}>
                      Clears small balances first to build momentum
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </Animated.View>
      </ScrollView>

      {/* Prepayment Simulator Modal */}
      <PrepaymentSimulatorModal
        visible={selectedLoanForPrepay !== null}
        loan={selectedLoanForPrepay}
        onClose={() => setSelectedLoanForPrepay(null)}
        onApplyPrepayment={handleApplyPrepayment}
      />

      {/* Amortisation Schedule Modal */}
      <AmortisationModal
        visible={selectedLoanForSchedule !== null}
        loan={selectedLoanForSchedule}
        onClose={() => setSelectedLoanForSchedule(null)}
      />

      {/* Tesla HUD Feedback Modal */}
      <TeslaHudModal
        visible={hudModal.visible}
        title={hudModal.title}
        subtitle={hudModal.subtitle}
        icon={hudModal.icon}
        badge={hudModal.badge}
        accentColor={hudModal.accentColor}
        onClose={() => setHudModal((prev) => ({ ...prev, visible: false }))}
      />
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
  homeBackBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  homeBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  viewSwitcherBar: {
    flexDirection: 'row',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  switcherTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  switcherTabActive: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  switcherTabActiveCalendar: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  switcherTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  switcherTabTextActive: {
    color: '#FFB800',
    fontWeight: '800',
  },
  switcherTabTextActiveCalendar: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#0D111A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emiSummaryValue: {
    color: '#FFB800',
  },
  loansSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1,
  },
  sectionSubCount: {
    fontSize: 10.5,
    color: '#65738E',
  },
  payoffCard: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    gap: 12,
  },
  payoffHeader: {
    gap: 3,
  },
  payoffBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 1,
  },
  payoffTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  payoffCompareRow: {
    flexDirection: 'row',
    backgroundColor: '#07090E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  payoffCol: {
    flex: 1,
    gap: 3,
  },
  payoffDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  payoffColLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  payoffSavingsText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#00E676',
  },
  payoffSnowballText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFB800',
  },
  payoffColSub: {
    fontSize: 9.5,
    color: '#8E9BB0',
    lineHeight: 13,
  },
});
