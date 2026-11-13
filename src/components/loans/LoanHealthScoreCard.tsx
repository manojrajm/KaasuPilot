import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LoanHealthBreakdown } from '@/domain/loans/loanHealth';

interface LoanHealthScoreCardProps {
  health: LoanHealthBreakdown;
}

export function LoanHealthScoreCard({ health }: LoanHealthBreakdownProps) {
  return (
    <View style={[styles.card, { borderColor: `${health.tierColor}40` }]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.titleWithPulse}>
          <View style={[styles.pulseDot, { backgroundColor: health.tierColor }]} />
          <Text style={styles.cardTitle}>LOAN HEALTH SCORE</Text>
        </View>

        <View
          style={[
            styles.tierPill,
            {
              backgroundColor: `${health.tierColor}18`,
              borderColor: health.tierColor,
            },
          ]}>
          <Text style={[styles.tierText, { color: health.tierColor }]}>
            {health.tier}
          </Text>
        </View>
      </View>

      {/* Hero Score Display */}
      <View style={styles.heroRow}>
        <View style={styles.scoreNumberCol}>
          <Text style={[styles.scoreValue, { color: health.tierColor }]}>
            {health.score}
          </Text>
          <Text style={styles.scoreMax}>/ 100</Text>
        </View>

        <View style={styles.scoreBarTrack}>
          <View
            style={[
              styles.scoreBarFill,
              {
                width: `${health.score}%`,
                backgroundColor: health.tierColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Telemetry Breakdown Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCell}>
          <Text style={styles.cellLabel}>DTI RATIO</Text>
          <Text
            style={[
              styles.cellValue,
              { color: health.dtiPercent <= 35 ? '#00E676' : '#FFB800' },
            ]}>
            {health.dtiPercent}%
          </Text>
          <Text style={styles.cellSub}>Ideal ≤ 30%</Text>
        </View>

        <View style={styles.cellDivider} />

        <View style={styles.metricCell}>
          <Text style={styles.cellLabel}>EMI BUFFER</Text>
          <Text
            style={[
              styles.cellValue,
              { color: health.emergencyBufferMonths >= 3 ? '#00E676' : '#FF6B6B' },
            ]}>
            {health.emergencyBufferMonths}m
          </Text>
          <Text style={styles.cellSub}>Liquid reserve</Text>
        </View>

        <View style={styles.cellDivider} />

        <View style={styles.metricCell}>
          <Text style={styles.cellLabel}>DISCIPLINE</Text>
          <Text style={[styles.cellValue, { color: '#00F0FF' }]}>
            {health.disciplineScore}/15
          </Text>
          <Text style={styles.cellSub}>Repayment streak</Text>
        </View>
      </View>

      {/* Recommendations */}
      {health.recommendations.length > 0 ? (
        <View style={styles.recBox}>
          <Text style={styles.recIcon}>💡</Text>
          <Text style={styles.recText} numberOfLines={2}>
            {health.recommendations[0]}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type LoanHealthBreakdownProps = LoanHealthScoreCardProps;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D111A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 1.2,
  },
  tierPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  heroRow: {
    gap: 8,
  },
  scoreNumberCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  scoreValue: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  scoreMax: {
    fontSize: 13,
    fontWeight: '700',
    color: '#65738E',
  },
  scoreBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#07090E',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  cellDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  cellLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  cellValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  cellSub: {
    fontSize: 9,
    color: '#8E9BB0',
  },
  recBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
  },
  recIcon: {
    fontSize: 13,
  },
  recText: {
    flex: 1,
    fontSize: 11,
    color: '#FFB800',
    lineHeight: 15,
  },
});
