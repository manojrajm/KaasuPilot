import React, { useRef, useEffect } from 'react';
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

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { formatPaise } from '@/domain/money/format';
import { useFinancialAnalytics } from '@/hooks/useFinancialAnalytics';

export default function AnalyticsExploreScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();

  const {
    loading,
    monthLabel,
    totalIncomePaise,
    totalExpensePaise,
    netSurplusPaise,
    savingsRatePercent,
    categoryBreakdown,
    envelope,
    insights,
    goToPrevMonth,
    goToNextMonth,
  } = useFinancialAnalytics();

  // Entrance Transition
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

  const isSurplusPositive = netSurplusPaise >= 0;
  const expensePercentageOfIncome =
    totalIncomePaise > 0
      ? Math.min(100, Math.round((totalExpensePaise / totalIncomePaise) * 100))
      : 100;

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
              <View style={styles.badgeRow}>
                <Text style={styles.badgeIcon}>📊</Text>
                <Text style={styles.badgeText}>FINANCIAL INTELLIGENCE ENGINE</Text>
              </View>
              <Text style={styles.headerTitle}>Analytics & Budgets</Text>
            </View>

            <Pressable
              onPress={() => router.push('/')}
              style={styles.homeBackBtn}
              hitSlop={8}>
              <Text style={styles.homeBackText}>‹ Home</Text>
            </Pressable>
          </View>

          {/* 2. Month Selector Navigation */}
          <View style={styles.monthSelectorBar}>
            <Pressable onPress={goToPrevMonth} style={styles.monthNavBtn} hitSlop={10}>
              <Text style={styles.monthNavBtnText}>‹ Prev</Text>
            </Pressable>

            <View style={styles.monthLabelPod}>
              <Text style={styles.monthLabelText}>{monthLabel.toUpperCase()}</Text>
            </View>

            <Pressable onPress={goToNextMonth} style={styles.monthNavBtn} hitSlop={10}>
              <Text style={styles.monthNavBtnText}>Next ›</Text>
            </Pressable>
          </View>

          {/* 3. Monthly Net Cash-Flow Summary Card */}
          <View style={styles.cashFlowCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>MONTHLY CASH-FLOW MATRIX</Text>
              <View style={[styles.surplusBadge, isSurplusPositive ? styles.surplusPositive : styles.surplusNegative]}>
                <Text style={styles.surplusBadgeText}>
                  {isSurplusPositive ? `+${savingsRatePercent}% SAVED` : 'DEFICIT'}
                </Text>
              </View>
            </View>

            <View style={styles.numbersGrid}>
              <View style={styles.numberCol}>
                <Text style={styles.numberLabel}>TOTAL INFLOW</Text>
                <Text style={[styles.numberValue, { color: '#00E676' }]}>
                  + {formatPaise(totalIncomePaise)}
                </Text>
              </View>

              <View style={styles.numberCol}>
                <Text style={styles.numberLabel}>TOTAL OUTFLOW</Text>
                <Text style={[styles.numberValue, { color: '#FFFFFF' }]}>
                  - {formatPaise(totalExpensePaise)}
                </Text>
              </View>

              <View style={styles.numberCol}>
                <Text style={styles.numberLabel}>NET SURPLUS</Text>
                <Text
                  style={[
                    styles.numberValue,
                    { color: isSurplusPositive ? '#FFD700' : '#FF3B30' },
                  ]}>
                  {isSurplusPositive ? '+' : '-'} {formatPaise(Math.abs(netSurplusPaise))}
                </Text>
              </View>
            </View>

            {/* Retention Bar */}
            <View style={styles.flowBarContainer}>
              <View style={[styles.flowBarSpent, { width: `${expensePercentageOfIncome}%` }]} />
            </View>
            <View style={styles.flowBarLabels}>
              <Text style={styles.flowBarSubText}>Outflow: {expensePercentageOfIncome}% of income</Text>
              <Text style={styles.flowBarSubText}>
                Retained: {Math.max(0, 100 - expensePercentageOfIncome)}%
              </Text>
            </View>
          </View>

          {/* 4. 50 / 30 / 20 Envelope Discipline Pods */}
          <View style={styles.envelopeSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>50 / 30 / 20 ENVELOPE BUDGETS</Text>
              <Text style={styles.sectionBadge}>DISCIPLINE METRICS</Text>
            </View>

            {/* Envelope 1: Needs */}
            <View style={styles.envelopePod}>
              <View style={styles.envelopeHeader}>
                <View>
                  <Text style={styles.envelopeTitle}>{envelope.needs.title}</Text>
                  <Text style={styles.envelopeSub}>{envelope.needs.subtitle}</Text>
                </View>
                <Text
                  style={[
                    styles.envelopePercent,
                    envelope.needs.isOverBudget && styles.percentExceeded,
                  ]}>
                  {envelope.needs.percentUsed}%
                </Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, envelope.needs.percentUsed)}%`,
                      backgroundColor: envelope.needs.isOverBudget ? '#FF3B30' : '#00F0FF',
                    },
                  ]}
                />
              </View>

              <View style={styles.envelopeFooter}>
                <Text style={styles.envelopeSpent}>
                  Spent: {formatPaise(envelope.needs.actualPaise)}
                </Text>
                <Text style={styles.envelopeTarget}>
                  Cap: {formatPaise(envelope.needs.targetPaise)}
                </Text>
              </View>
            </View>

            {/* Envelope 2: Wants */}
            <View style={styles.envelopePod}>
              <View style={styles.envelopeHeader}>
                <View>
                  <Text style={styles.envelopeTitle}>{envelope.wants.title}</Text>
                  <Text style={styles.envelopeSub}>{envelope.wants.subtitle}</Text>
                </View>
                <Text
                  style={[
                    styles.envelopePercent,
                    envelope.wants.isOverBudget && styles.percentExceeded,
                  ]}>
                  {envelope.wants.percentUsed}%
                </Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, envelope.wants.percentUsed)}%`,
                      backgroundColor: envelope.wants.isOverBudget ? '#FF3B30' : '#FF9500',
                    },
                  ]}
                />
              </View>

              <View style={styles.envelopeFooter}>
                <Text style={styles.envelopeSpent}>
                  Spent: {formatPaise(envelope.wants.actualPaise)}
                </Text>
                <Text style={styles.envelopeTarget}>
                  Cap: {formatPaise(envelope.wants.targetPaise)}
                </Text>
              </View>
            </View>

            {/* Envelope 3: Savings */}
            <View style={styles.envelopePod}>
              <View style={styles.envelopeHeader}>
                <View>
                  <Text style={styles.envelopeTitle}>{envelope.savings.title}</Text>
                  <Text style={styles.envelopeSub}>{envelope.savings.subtitle}</Text>
                </View>
                <Text style={[styles.envelopePercent, { color: '#00E676' }]}>
                  {envelope.savings.percentUsed}%
                </Text>
              </View>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, envelope.savings.percentUsed)}%`,
                      backgroundColor: '#00E676',
                    },
                  ]}
                />
              </View>

              <View style={styles.envelopeFooter}>
                <Text style={styles.envelopeSpent}>
                  Accumulated: {formatPaise(envelope.savings.actualPaise)}
                </Text>
                <Text style={styles.envelopeTarget}>
                  Target: {formatPaise(envelope.savings.targetPaise)}
                </Text>
              </View>
            </View>
          </View>

          {/* 5. Category Spend Radar Breakdown */}
          <View style={styles.breakdownSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>CATEGORY SPEND RADAR</Text>
              <Text style={styles.sectionBadge}>RANKED OUTFLOWS</Text>
            </View>

            {categoryBreakdown.length === 0 ? (
              <View style={styles.emptyBreakdown}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>Zero Expenditures Recorded</Text>
                <Text style={styles.emptySub}>
                  No confirmed debit transactions found for {monthLabel}.
                </Text>
              </View>
            ) : (
              <View style={styles.categoryList}>
                {categoryBreakdown.map((item) => (
                  <View key={item.category.id} style={styles.categoryRow}>
                    <View style={styles.categoryTop}>
                      <View style={styles.categoryMeta}>
                        <Text style={styles.categoryEmoji}>{item.category.emoji}</Text>
                        <View>
                          <Text style={styles.categoryName}>{item.category.name}</Text>
                          <Text style={styles.categoryCount}>
                            {item.transactionCount} {item.transactionCount === 1 ? 'transaction' : 'transactions'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.categoryAmountCol}>
                        <Text style={styles.categoryAmount}>{formatPaise(item.amountPaise)}</Text>
                        <Text style={styles.categoryPercent}>{item.percentage}%</Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.catBarBg}>
                      <View
                        style={[
                          styles.catBarFill,
                          {
                            width: `${Math.min(100, item.percentage)}%`,
                            backgroundColor: item.category.color || '#00F0FF',
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 6. Explainable Telemetry Insights (Tamil + English) */}
          {insights.length > 0 ? (
            <View style={styles.insightsSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>TELEMETRY INTELLIGENCE INSIGHTS</Text>
                <Text style={styles.sectionBadge}>EXPLAINABLE LOGIC</Text>
              </View>

              {insights.map((ins) => (
                <View key={ins.id} style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <View style={styles.insightTitleRow}>
                      <Text style={styles.insightIcon}>{ins.icon}</Text>
                      <Text style={styles.insightTitle}>{ins.title}</Text>
                    </View>
                    <View style={[styles.insightBadge, { borderColor: ins.badgeColor }]}>
                      <Text style={[styles.insightBadgeText, { color: ins.badgeColor }]}>
                        {ins.badge}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.insightMsgTamil}>{ins.messageTamil}</Text>
                  <Text style={styles.insightMsgEnglish}>{ins.messageEnglish}</Text>
                </View>
              ))}
            </View>
          ) : null}
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
    gap: Spacing.four,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    fontSize: 11,
  },
  badgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  homeBackBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  homeBackText: {
    color: '#00F0FF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  monthSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 6,
  },
  monthNavBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  monthNavBtnText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '800',
  },
  monthLabelPod: {
    alignItems: 'center',
  },
  monthLabelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  cashFlowCard: {
    backgroundColor: '#0F1420',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#8A96AD',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  surplusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  surplusPositive: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: '#00E676',
  },
  surplusNegative: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderColor: '#FF3B30',
  },
  surplusBadgeText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  numbersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numberCol: {
    gap: 3,
  },
  numberLabel: {
    color: '#5A667D',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  numberValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  flowBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0, 230, 118, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  flowBarSpent: {
    height: '100%',
    backgroundColor: '#FF3B30',
  },
  flowBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flowBarSubText: {
    color: '#5A667D',
    fontSize: 10,
    fontWeight: '600',
  },
  envelopeSection: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionBadge: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  envelopePod: {
    backgroundColor: '#0F1420',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 8,
  },
  envelopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  envelopeTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  envelopeSub: {
    color: '#5A667D',
    fontSize: 10.5,
    fontWeight: '600',
  },
  envelopePercent: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '900',
  },
  percentExceeded: {
    color: '#FF3B30',
  },
  progressBarBg: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  envelopeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  envelopeSpent: {
    color: '#8A96AD',
    fontSize: 11,
    fontWeight: '700',
  },
  envelopeTarget: {
    color: '#5A667D',
    fontSize: 11,
    fontWeight: '600',
  },
  breakdownSection: {
    gap: 10,
  },
  emptyBreakdown: {
    backgroundColor: '#0F1420',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptySub: {
    color: '#5A667D',
    fontSize: 11.5,
  },
  categoryList: {
    gap: 10,
  },
  categoryRow: {
    backgroundColor: '#0F1420',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
    gap: 8,
  },
  categoryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  categoryCount: {
    color: '#5A667D',
    fontSize: 10.5,
  },
  categoryAmountCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  categoryAmount: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
  },
  categoryPercent: {
    color: '#00F0FF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  catBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightsSection: {
    gap: 10,
  },
  insightCard: {
    backgroundColor: '#0F1420',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 6,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  insightIcon: {
    fontSize: 14,
  },
  insightTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  insightBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  insightBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  insightMsgTamil: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  insightMsgEnglish: {
    color: '#8A96AD',
    fontSize: 11,
    lineHeight: 15,
  },
});
