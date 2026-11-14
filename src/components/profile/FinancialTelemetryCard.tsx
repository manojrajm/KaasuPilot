import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatPaise } from '@/domain/money/format';
import { UserProfile } from '@/domain/profile/types';

interface FinancialTelemetryCardProps {
  profile: UserProfile;
  salaryAccountName?: string;
  onEdit: () => void;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function FinancialTelemetryCard({
  profile,
  salaryAccountName,
  onEdit,
}: FinancialTelemetryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>FINANCIAL TELEMETRY</Text>
        <Pressable onPress={onEdit} hitSlop={10}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
      </View>

      <View style={styles.metricsContainer}>
        {/* Metric 1: Monthly Salary */}
        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Text style={styles.metricIcon}>💰</Text>
            <View>
              <Text style={styles.metricLabel}>MONTHLY SALARY</Text>
              <Text style={styles.metricSub}>Credited automatically on salary cycle</Text>
            </View>
          </View>
          <Text style={styles.incomeValue}>
            {formatPaise(profile.monthlyIncomePaise)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Metric 2: Salary Day */}
        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Text style={styles.metricIcon}>🗓️</Text>
            <View>
              <Text style={styles.metricLabel}>SALARY CYCLE DATE</Text>
              <Text style={styles.metricSub}>Monthly cycle rollover day</Text>
            </View>
          </View>
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>{getOrdinal(profile.salaryDayOfMonth)} of Month</Text>
          </View>
        </View>

        {/* Metric 3: Salary Account (if assigned) */}
        {salaryAccountName ? (
          <>
            <View style={styles.divider} />
            <View style={styles.metricRow}>
              <View style={styles.metricLeft}>
                <Text style={styles.metricIcon}>💳</Text>
                <View>
                  <Text style={styles.metricLabel}>CREDITED TO ACCOUNT</Text>
                  <Text style={styles.metricSub}>Designated salary destination</Text>
                </View>
              </View>
              <Text style={styles.formatValue}>{salaryAccountName}</Text>
            </View>
          </>
        ) : null}

        <View style={styles.divider} />

        {/* Metric 4: Number Format */}
        <View style={styles.metricRow}>
          <View style={styles.metricLeft}>
            <Text style={styles.metricIcon}>🇮🇳</Text>
            <View>
              <Text style={styles.metricLabel}>CURRENCY DENOMINATION</Text>
              <Text style={styles.metricSub}>Standard Indian format</Text>
            </View>
          </View>
          <Text style={styles.formatValue}>₹ Lakhs / Crores</Text>
        </View>
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
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  editText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00F0FF',
  },
  metricsContainer: {
    backgroundColor: '#07090E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricIcon: {
    fontSize: 18,
  },
  metricLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.6,
  },
  metricSub: {
    fontSize: 9,
    color: '#65738E',
    marginTop: 1,
  },
  incomeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00E676',
  },
  dayBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFB800',
  },
  formatValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 4,
  },
});