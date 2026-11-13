import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatPaise, formatCompactPaise } from '@/domain/money/format';
import { CashFlowInfo } from '@/hooks/useHomeDashboard';

interface CashFlowGaugeProps {
  cashFlow: CashFlowInfo;
}

export function CashFlowGauge({ cashFlow }: CashFlowGaugeProps) {
  const remainingPaise = Math.max(0, cashFlow.budgetLimitPaise - cashFlow.spentPaise);
  const percent = Math.min(100, Math.round(cashFlow.percentageUsed));

  // Tesla dynamic power meter color
  let progressColor = '#00F0FF';
  if (percent > 90) {
    progressColor = '#FF3B30';
  } else if (percent > 75) {
    progressColor = '#FFB300';
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>THIS MONTH'S CASH FLOW</Text>
        <Text style={styles.monthTag}>NOVEMBER 2026</Text>
      </View>

      {/* Income vs Spent Telemetry Cards */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>TOTAL INCOME</Text>
          <Text style={styles.incomeValue}>+{formatCompactPaise(cashFlow.incomePaise)}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>TOTAL SPENT</Text>
          <Text style={styles.spentValue}>-{formatCompactPaise(cashFlow.spentPaise)}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>REMAINING</Text>
          <Text style={styles.remainingValue}>{formatCompactPaise(remainingPaise)}</Text>
        </View>
      </View>

      {/* Segmented Power Meter Bar */}
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeLabels}>
          <Text style={styles.gaugeSubtext}>Budget Consumed</Text>
          <Text style={[styles.gaugePercentText, { color: progressColor }]}>
            {percent}% of limit
          </Text>
        </View>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${percent}%`,
                backgroundColor: progressColor,
                shadowColor: progressColor,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  monthTag: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#8E9BB0',
    letterSpacing: 0.8,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  incomeValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00E676',
  },
  spentValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00F0FF',
  },
  gaugeContainer: {
    gap: 6,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeSubtext: {
    fontSize: 11,
    color: '#8E9BB0',
    fontWeight: '500',
  },
  gaugePercentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 2,
  },
});
