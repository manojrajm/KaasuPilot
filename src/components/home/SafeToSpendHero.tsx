import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { formatPaise, formatCompactPaise } from '@/domain/money/format';
import { SafeToSpendResult, OutflowsBreakdown } from '@/domain/budget/safeToSpend';

interface SafeToSpendHeroProps {
  safeToSpend: SafeToSpendResult;
  outflows: OutflowsBreakdown;
  onPressDetails?: () => void;
}

export function SafeToSpendHero({ safeToSpend, outflows, onPressDetails }: SafeToSpendHeroProps) {
  // Luminous pulsing radar animation
  const pulseOpacity = useSharedValue(0.35);
  const pulseScale = useSharedValue(1);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.7, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    pulseScale.value = withRepeat(
      withTiming(1.04, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulseOpacity, pulseScale]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedCardPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const handlePressIn = () => {
    pressScale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 15 });
  };

  const isHealthy = safeToSpend.statusLevel === 'healthy';
  const accentColor = isHealthy ? '#00F0FF' : safeToSpend.statusLevel === 'caution' ? '#FFB300' : '#FF3B30';

  return (
    <Pressable
      onPress={onPressDetails}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.pressableContainer}>
      <Animated.View style={[styles.heroCard, animatedCardPressStyle]}>
        {/* Ambient Radial Mesh Glow */}
        <Animated.View
          style={[
            styles.radialGlow,
            { backgroundColor: accentColor },
            animatedGlowStyle,
          ]}
        />

        {/* Top Telemetry Header */}
        <View style={styles.topTelemetryRow}>
          <View style={styles.statusBadge}>
            <View style={[styles.beaconDot, { backgroundColor: accentColor }]} />
            <Text style={styles.statusLabel}>SAFE TO SPEND TODAY</Text>
          </View>
          <View style={styles.engineBadge}>
            <Text style={styles.engineText}>AI CO-PILOT v1.0</Text>
          </View>
        </View>

        {/* Big Telemetry Figure */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <Text style={[styles.amountText, { textShadowColor: accentColor }]}>
            {formatPaise(safeToSpend.safeToSpendTodayPaise, { prefix: '' })}
          </Text>
          <Text style={styles.perDayText}>/ day</Text>
        </View>

        {/* Horizon Divider */}
        <View style={styles.horizonLine}>
          <View style={[styles.horizonFill, { backgroundColor: accentColor }]} />
        </View>

        {/* Contextual Outflows Matrix */}
        <View style={styles.telemetryMetricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>DAYS TO SALARY</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValueLarge}>{safeToSpend.daysUntilNextIncome}</Text>
              <Text style={styles.metricValueUnit}>days left</Text>
            </View>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>COMMITTED OUTFLOWS</Text>
            <View style={styles.metricValueRow}>
              <Text style={styles.metricValueLarge}>
                {formatCompactPaise(safeToSpend.totalCommittedPaise)}
              </Text>
              <Text style={styles.metricValueUnit}>pre-allocated</Text>
            </View>
          </View>
        </View>

        {/* Breakdown Glass Chips */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipEmoji}>🏦</Text>
            <Text style={styles.chipText}>EMI {formatCompactPaise(outflows.emiPaise)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipEmoji}>💳</Text>
            <Text style={styles.chipText}>Card {formatCompactPaise(outflows.cardDuePaise)}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipEmoji}>🔁</Text>
            <Text style={styles.chipText}>Subs {formatCompactPaise(outflows.subscriptionsPaise)}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableContainer: {
    width: '100%',
  },
  heroCard: {
    position: 'relative',
    backgroundColor: '#0D111A',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  radialGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.18,
  },
  topTelemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  beaconDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8E9BB0',
    letterSpacing: 1.2,
  },
  engineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  engineText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 0.8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
    gap: 4,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  amountText: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  perDayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#65738E',
    marginLeft: 4,
  },
  horizonLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 16,
    position: 'relative',
  },
  horizonFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '35%',
    opacity: 0.8,
  },
  telemetryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  metricBlock: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginHorizontal: 16,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  metricValueLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricValueUnit: {
    fontSize: 12,
    color: '#8E9BB0',
    fontWeight: '500',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  chipEmoji: {
    fontSize: 12,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#B0BAC9',
  },
});
