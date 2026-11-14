import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { Spacing } from '@/constants/theme';
import { SpendingVelocityTelemetry, VelocityPace } from '@/domain/budget/spendingVelocity';
import { formatPaise } from '@/domain/money/format';

interface SpendingVelocityGaugeProps {
  telemetry: SpendingVelocityTelemetry;
  onPressDetails?: () => void;
}

export function SpendingVelocityGauge({ telemetry, onPressDetails }: SpendingVelocityGaugeProps) {
  const isPaceGood = telemetry.pace === 'optimal' || telemetry.pace === 'normal';
  const paceLabel =
    telemetry.pace === 'optimal'
      ? 'OPTIMAL PACE'
      : telemetry.pace === 'normal'
      ? 'ON TRACK'
      : telemetry.pace === 'accelerated'
      ? 'BURN ACCELERATED'
      : 'RUNWAY CRITICAL';

  const paceColor =
    telemetry.pace === 'optimal'
      ? '#00E676'
      : telemetry.pace === 'normal'
      ? '#00F0FF'
      : telemetry.pace === 'accelerated'
      ? '#FFB800'
      : '#FF6B61';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.pulseDot, { backgroundColor: paceColor }]} />
          <Text style={styles.headerTitle}>SPENDING VELOCITY & RUNWAY</Text>
        </View>

        <View style={[styles.pacePill, { borderColor: paceColor, backgroundColor: `${paceColor}15` }]}>
          <Text style={[styles.pacePillText, { color: paceColor }]}>{paceLabel}</Text>
        </View>
      </View>

      {/* Main Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>DAILY BURN RATE</Text>
          <Text style={styles.metricValue}>
            {formatPaise(telemetry.dailyBurnRatePaise)}
            <Text style={styles.perDaySub}> /day</Text>
          </Text>
          <Text style={styles.metricNote}>Avg spend this cycle</Text>
        </View>

        <View style={styles.dividerV} />

        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>SAFE DAILY TARGET</Text>
          <Text style={[styles.metricValue, { color: '#00F0FF' }]}>
            {formatPaise(telemetry.dailySafeTargetPaise)}
            <Text style={styles.perDaySub}> /day</Text>
          </Text>
          <Text style={styles.metricNote}>Target to stay in budget</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.trackContainer}>
        <View style={styles.trackHeader}>
          <Text style={styles.trackTextLeft}>
            {telemetry.daysElapsed} days elapsed • {telemetry.daysRemaining} days left
          </Text>
          <Text style={[styles.trackTextRight, { color: paceColor }]}>
            {telemetry.cycleProgressPercent}% cycle
          </Text>
        </View>

        <View style={styles.trackBar}>
          <View
            style={[
              styles.trackFill,
              { width: `${telemetry.cycleProgressPercent}%`, backgroundColor: paceColor },
            ]}
          />
        </View>
      </View>

      {/* Month-End Forecast Pill */}
      <View
        style={[
          styles.forecastBanner,
          telemetry.isProjectedDeficit ? styles.deficitBanner : styles.surplusBanner,
        ]}>
        <Text style={styles.forecastIcon}>
          {telemetry.isProjectedDeficit ? '⚠️' : '🎯'}
        </Text>
        <View style={styles.forecastMeta}>
          <Text
            style={[
              styles.forecastTitle,
              telemetry.isProjectedDeficit ? styles.deficitText : styles.surplusText,
            ]}>
            {telemetry.isProjectedDeficit
              ? `- ${formatPaise(telemetry.projectedMonthEndSurplusPaise)} PROJECTED DEFICIT`
              : `+ ${formatPaise(telemetry.projectedMonthEndSurplusPaise)} PROJECTED SURPLUS`}
          </Text>
          <Text style={styles.forecastSub}>
            {telemetry.isProjectedDeficit
              ? 'At current velocity, spend exceeds available balance before salary day.'
              : 'Pacing allows savings rollover at the next salary credit.'}
          </Text>
        </View>
      </View>

      {onPressDetails ? (
        <Pressable onPress={onPressDetails} style={styles.viewAnalyticsLink}>
          <Text style={styles.viewAnalyticsText}>View Category Radar & 50/30/20 Analytics ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: Spacing.four,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerTitle: {
    color: '#8A96AD',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  pacePill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pacePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  metricBlock: {
    flex: 1,
    gap: 3,
  },
  metricLabel: {
    color: '#65738E',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  perDaySub: {
    color: '#8A96AD',
    fontSize: 12,
    fontWeight: '600',
  },
  metricNote: {
    color: '#5A667D',
    fontSize: 10,
    fontWeight: '500',
  },
  dividerV: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 12,
  },
  trackContainer: {
    gap: 6,
  },
  trackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackTextLeft: {
    color: '#8A96AD',
    fontSize: 11,
    fontWeight: '600',
  },
  trackTextRight: {
    fontSize: 11,
    fontWeight: '800',
  },
  trackBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
  },
  forecastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },
  surplusBanner: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  deficitBanner: {
    backgroundColor: 'rgba(255, 107, 97, 0.08)',
    borderColor: 'rgba(255, 107, 97, 0.3)',
  },
  forecastIcon: {
    fontSize: 18,
  },
  forecastMeta: {
    flex: 1,
    gap: 2,
  },
  forecastTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  surplusText: {
    color: '#00E676',
  },
  deficitText: {
    color: '#FF6B61',
  },
  forecastSub: {
    color: '#8A96AD',
    fontSize: 10.5,
    lineHeight: 14,
  },
  viewAnalyticsLink: {
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 4,
  },
  viewAnalyticsText: {
    color: '#00F0FF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
