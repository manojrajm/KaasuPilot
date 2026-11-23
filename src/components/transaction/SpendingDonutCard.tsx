import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { DEFAULT_CATEGORIES } from '@/data/seed/defaultCategories';
import { useCategories } from '@/hooks/useCategories';
import { formatCompactPaise, formatPaise } from '@/domain/money/format';
import { Transaction } from '@/domain/types';

interface SpendingDonutCardProps {
  transactions: Transaction[];
  selectedCategoryId?: string;
  onSelectCategory?: (categoryId?: string) => void;
  periodLabel?: string;
  mode?: 'debit' | 'credit';
  onToggleMode?: (mode: 'debit' | 'credit') => void;
}

interface SegmentItem {
  id: string;
  name: string;
  emoji: string;
  amountPaise: number;
  percentage: number;
  color: string;
  strokeDashoffset: number;
  strokeDasharray: string;
}

const PALETTE = [
  '#00F0FF', // Cyan / Electric Blue (EMI / Primary)
  '#00E676', // Emerald Green (Food / Groceries)
  '#A855F7', // Vibrant Purple (Shopping)
  '#FF6D00', // Cyber Orange (Bills)
  '#78909C', // Slate Grey (Other)
  '#FFD700', // Gold
  '#FF3B30', // Red
];

const SVG_SIZE = 140;
const STROKE_WIDTH = 20;
const RADIUS = (SVG_SIZE - STROKE_WIDTH) / 2; // 60
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~376.99

export function SpendingDonutCard({
  transactions,
  selectedCategoryId,
  onSelectCategory,
  periodLabel = 'THIS PERIOD',
  mode = 'debit',
  onToggleMode,
}: SpendingDonutCardProps) {
  const { allCategories } = useCategories();
  // Animation controllers for fluid donut entrance & sweep
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Filter transactions by mode (default 'debit' for expense spending)
  const targetTxns = useMemo(() => {
    return transactions.filter((t) => t.direction === mode);
  }, [transactions, mode]);

  // Aggregate by category
  const { totalPaise, segments } = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let total = 0;

    targetTxns.forEach((tx) => {
      categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + tx.amountPaise;
      total += tx.amountPaise;
    });

    if (total === 0) {
      return { totalPaise: 0, segments: [] };
    }

    const categoriesMap = new Map([
      ...DEFAULT_CATEGORIES.map((c) => [c.id, c] as const),
      ...allCategories.map((c) => [c.id, c] as const),
    ]);

    // Sort categories descending by spend amount
    const sorted = Object.entries(categoryTotals)
      .map(([catId, amount]) => ({
        catId,
        amount,
        percentage: Math.round((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    // Take top 4, combine rest into "Other" (matching user's uploaded image with 5 rows)
    const top4 = sorted.slice(0, 4);
    const rest = sorted.slice(4);

    const itemsToRender: {
      id: string;
      name: string;
      emoji: string;
      amountPaise: number;
      percentage: number;
      color: string;
    }[] = [];

    top4.forEach((item, index) => {
      const cat = categoriesMap.get(item.catId);
      itemsToRender.push({
        id: item.catId,
        name: cat?.name || 'General',
        emoji: cat?.emoji || '🏷️',
        amountPaise: item.amount,
        percentage: item.percentage,
        color: PALETTE[index % PALETTE.length],
      });
    });

    if (rest.length > 0) {
      const otherAmount = rest.reduce((sum, r) => sum + r.amount, 0);
      const otherPercent = Math.max(1, Math.round((otherAmount / total) * 100));
      itemsToRender.push({
        id: 'cat_other_group',
        name: 'Other',
        emoji: '📦',
        amountPaise: otherAmount,
        percentage: otherPercent,
        color: PALETTE[4], // Slate grey
      });
    }

    // Calculate SVG circle dash offsets
    let currentOffset = 0;
    const computedSegments: SegmentItem[] = itemsToRender.map((item) => {
      const segmentLength = (item.percentage / 100) * CIRCUMFERENCE;
      const strokeDashoffset = -currentOffset;
      currentOffset += segmentLength;

      return {
        ...item,
        strokeDashoffset,
        strokeDasharray: `${segmentLength} ${CIRCUMFERENCE - segmentLength}`,
      };
    });

    return { totalPaise: total, segments: computedSegments };
  }, [targetTxns]);

  // Trigger fluid sweep animation whenever data or mode changes
  useEffect(() => {
    sweepAnim.setValue(0);
    scaleAnim.setValue(0.92);
    fadeAnim.setValue(0);

    Animated.parallel([
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode, targetTxns.length, sweepAnim, scaleAnim, fadeAnim]);

  const rotationInterpolate = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '0deg'],
  });

  return (
    <View style={styles.card}>
      {/* Top Header Row with Scope & Flow Toggle */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.badgeRow}>
            <View style={styles.neonDot} />
            <Text style={styles.badgeText}>
              {mode === 'debit' ? 'SPEND DISTRIBUTION' : 'INCOME DISTRIBUTION'}
            </Text>
          </View>
          <Text style={styles.periodText}>{periodLabel}</Text>
        </View>

        {onToggleMode ? (
          <View style={styles.modeToggleContainer}>
            <Pressable
              onPress={() => onToggleMode('debit')}
              style={[styles.modeBtn, mode === 'debit' && styles.modeBtnActiveExpense]}>
              <Text
                style={[
                  styles.modeBtnText,
                  mode === 'debit' && styles.modeBtnTextActiveExpense,
                ]}>
                💸 Spent
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onToggleMode('credit')}
              style={[styles.modeBtn, mode === 'credit' && styles.modeBtnActiveIncome]}>
              <Text
                style={[
                  styles.modeBtnText,
                  mode === 'credit' && styles.modeBtnTextActiveIncome,
                ]}>
                💰 Income
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Main Content: Left Donut + Right Legend */}
      <View style={styles.contentRow}>
        {/* Left: Animated Donut Ring */}
        <View style={styles.donutContainer}>
          {totalPaise > 0 ? (
            <Animated.View
              style={{
                width: SVG_SIZE,
                height: SVG_SIZE,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }, { rotate: rotationInterpolate }],
              }}>
              <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
                <G rotation="-90" origin={`${SVG_SIZE / 2}, ${SVG_SIZE / 2}`}>
                  {/* Subtle Background Ring */}
                  <Circle
                    cx={SVG_SIZE / 2}
                    cy={SVG_SIZE / 2}
                    r={RADIUS}
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                  />

                  {/* Segmented Arcs */}
                  {segments.map((seg) => {
                    const isSelected = selectedCategoryId === seg.id;
                    return (
                      <Circle
                        key={seg.id}
                        cx={SVG_SIZE / 2}
                        cy={SVG_SIZE / 2}
                        r={RADIUS}
                        stroke={seg.color}
                        strokeWidth={isSelected ? STROKE_WIDTH + 3 : STROKE_WIDTH}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        strokeLinecap="round"
                        fill="none"
                        opacity={!selectedCategoryId || isSelected ? 1 : 0.4}
                      />
                    );
                  })}
                </G>
              </Svg>
            </Animated.View>
          ) : (
            <View style={[styles.emptyRing, { width: SVG_SIZE, height: SVG_SIZE }]}>
              <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
                <Circle
                  cx={SVG_SIZE / 2}
                  cy={SVG_SIZE / 2}
                  r={RADIUS}
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth={STROKE_WIDTH}
                  strokeDasharray="6 6"
                  fill="none"
                />
              </Svg>
            </View>
          )}

          {/* Center Label (Total \n ₹38.9k) */}
          <View style={styles.donutCenter}>
            <Text style={styles.centerLabel}>Total</Text>
            <Text style={styles.centerAmount} numberOfLines={1}>
              {formatCompactPaise(totalPaise)}
            </Text>
          </View>
        </View>

        {/* Right: Legend Breakdown Rows */}
        <View style={styles.legendContainer}>
          {segments.length > 0 ? (
            segments.map((seg) => {
              const isSelected = selectedCategoryId === seg.id;

              return (
                <Pressable
                  key={seg.id}
                  onPress={() => {
                    if (onSelectCategory) {
                      onSelectCategory(isSelected ? undefined : seg.id);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.legendRow,
                    isSelected && styles.legendRowSelected,
                    pressed && styles.legendRowPressed,
                  ]}>
                  {/* Color Pill */}
                  <View style={[styles.colorSquare, { backgroundColor: seg.color }]} />

                  {/* Category Name */}
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {seg.name}
                  </Text>

                  {/* Percentage & Amount */}
                  <View style={styles.legendRight}>
                    <Text style={styles.percentageText}>{seg.percentage}%</Text>
                    <Text style={styles.amountSub}>{formatPaise(seg.amountPaise)}</Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyLegendBox}>
              <Text style={styles.emptyLegendText}>No transactions recorded</Text>
              <Text style={styles.emptyLegendSub}>for this period scope.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0C0E14',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  neonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.8,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A96AD',
    marginTop: 2,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  modeBtnActiveExpense: {
    backgroundColor: 'rgba(255, 109, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FF6D00',
  },
  modeBtnActiveIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  modeBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8A96AD',
  },
  modeBtnTextActiveExpense: {
    color: '#FF6D00',
  },
  modeBtnTextActiveIncome: {
    color: '#00E676',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutContainer: {
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8A96AD',
    letterSpacing: 0.5,
  },
  centerAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 1,
  },
  legendContainer: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 8,
  },
  legendRowSelected: {
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  legendRowPressed: {
    opacity: 0.7,
  },
  colorSquare: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  categoryName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#DCE4F0',
  },
  legendRight: {
    alignItems: 'flex-end',
  },
  percentageText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  amountSub: {
    fontSize: 9,
    color: '#65738E',
    marginTop: 1,
  },
  emptyLegendBox: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLegendText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A96AD',
  },
  emptyLegendSub: {
    fontSize: 10,
    color: '#5A667D',
    marginTop: 2,
  },
});
