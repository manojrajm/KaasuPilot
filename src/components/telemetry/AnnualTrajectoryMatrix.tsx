import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import {
  computeTrajectoryPoints,
  pointsToAreaSplinePath,
  pointsToCatmullRomSpline,
} from '@/utils/splineMath';
import { formatCompactPaise, formatPaise } from '@/domain/money/format';
import {
  TrajectoryMode,
  useAnnualTrajectory,
} from '@/hooks/useAnnualTrajectory';
import {
  AnnualTrajectoryMonth,
  DailyTrajectoryPoint,
} from '@/data/repositories/trajectoryRepo';

const CHART_HEIGHT = 220;
const PADDING = { top: 28, bottom: 28, horizontal: 20 };

export function AnnualTrajectoryMatrix() {
  const {
    granularity,
    year,
    setYear,
    selectedMonthNumber,
    goToPrevMonth,
    goToNextMonth,
    drillDownToMonth,
    backToAnnual,
    timeframe,
    setTimeframe,
    availableYears,
    activeMode,
    setActiveMode,
    isolatedLine,
    toggleLineIsolation,
    annualData,
    dailyData,
    loading,
  } = useAnnualTrajectory();

  const [chartWidth, setChartWidth] = useState<number>(360);

  // Month selection for Annual mode (0-11)
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(() => {
    const m = new Date().getMonth();
    return Math.min(Math.max(0, m), 11);
  });

  // Day selection for Daily 30-Day mode (0 to totalDays-1)
  const [activeDayIndex, setActiveDayIndex] = useState<number>(() => {
    const today = new Date().getDate();
    return Math.max(0, today - 1);
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== chartWidth) {
      setChartWidth(w);
    }
  };

  // ==========================================
  // ANNUAL DATA COMPUTATION
  // ==========================================
  const months = useMemo(() => annualData?.months ?? [], [annualData?.months]);
  const annualTotals = annualData?.totals;

  const annualInflowSeries = useMemo(() => months.map((m) => m.inflowPaise), [months]);
  const annualOutflowSeries = useMemo(() => months.map((m) => m.outflowPaise), [months]);
  const annualCumulativeSeries = useMemo(
    () => months.map((m) => m.cumulativeSavingsPaise),
    [months]
  );

  const annualBounds = useMemo(() => {
    const all = [...annualInflowSeries, ...annualOutflowSeries, ...annualCumulativeSeries];
    if (all.length === 0) return { min: 0, max: 100000 };
    const minVal = Math.min(...all, 0);
    // Real dynamic scale: Min ₹1,000 (100,000 paise) to avoid divide-by-zero, NO artificial ₹1 Lakh ceiling!
    const maxVal = Math.max(...all, 100000);
    const range = maxVal - minVal || 1;
    return { min: minVal, max: maxVal + range * 0.15 };
  }, [annualInflowSeries, annualOutflowSeries, annualCumulativeSeries]);

  const annualInflowPoints = useMemo(
    () => computeTrajectoryPoints(annualInflowSeries, chartWidth, CHART_HEIGHT, annualBounds, PADDING),
    [annualInflowSeries, chartWidth, annualBounds]
  );
  const annualOutflowPoints = useMemo(
    () => computeTrajectoryPoints(annualOutflowSeries, chartWidth, CHART_HEIGHT, annualBounds, PADDING),
    [annualOutflowSeries, chartWidth, annualBounds]
  );
  const annualCumulativePoints = useMemo(
    () => computeTrajectoryPoints(annualCumulativeSeries, chartWidth, CHART_HEIGHT, annualBounds, PADDING),
    [annualCumulativeSeries, chartWidth, annualBounds]
  );

  // ==========================================
  // MONTHLY 30-DAY DAILY DATA COMPUTATION
  // ==========================================
  const days = useMemo(() => dailyData?.days ?? [], [dailyData?.days]);
  const dailyTotals = dailyData?.totals;

  const dailyInflowSeries = useMemo(() => days.map((d) => d.inflowPaise), [days]);
  const dailyOutflowSeries = useMemo(() => days.map((d) => d.outflowPaise), [days]);
  const dailyCumulativeSeries = useMemo(
    () => days.map((d) => d.cumulativeSavingsPaise),
    [days]
  );

  const dailyBounds = useMemo(() => {
    const all = [...dailyInflowSeries, ...dailyOutflowSeries, ...dailyCumulativeSeries];
    if (all.length === 0) return { min: 0, max: 50000 };
    const minVal = Math.min(...all, 0);
    // Min ₹500 (50,000 paise) so daily scale is ultra sharp and realistic
    const maxVal = Math.max(...all, 50000);
    const range = maxVal - minVal || 1;
    return { min: minVal, max: maxVal + range * 0.18 };
  }, [dailyInflowSeries, dailyOutflowSeries, dailyCumulativeSeries]);

  const dailyInflowPoints = useMemo(
    () => computeTrajectoryPoints(dailyInflowSeries, chartWidth, CHART_HEIGHT, dailyBounds, PADDING),
    [dailyInflowSeries, chartWidth, dailyBounds]
  );
  const dailyOutflowPoints = useMemo(
    () => computeTrajectoryPoints(dailyOutflowSeries, chartWidth, CHART_HEIGHT, dailyBounds, PADDING),
    [dailyOutflowSeries, chartWidth, dailyBounds]
  );
  const dailyCumulativePoints = useMemo(
    () => computeTrajectoryPoints(dailyCumulativeSeries, chartWidth, CHART_HEIGHT, dailyBounds, PADDING),
    [dailyCumulativeSeries, chartWidth, dailyBounds]
  );

  // Active Points & Spline Paths
  const isAnnual = granularity === 'annual';
  const currentInflowPoints = isAnnual ? annualInflowPoints : dailyInflowPoints;
  const currentOutflowPoints = isAnnual ? annualOutflowPoints : dailyOutflowPoints;
  const currentCumulativePoints = isAnnual ? annualCumulativePoints : dailyCumulativePoints;
  const activeBounds = isAnnual ? annualBounds : dailyBounds;

  const inflowPath = useMemo(
    () => pointsToCatmullRomSpline(currentInflowPoints),
    [currentInflowPoints]
  );
  const outflowPath = useMemo(
    () => pointsToCatmullRomSpline(currentOutflowPoints),
    [currentOutflowPoints]
  );
  const cumulativePath = useMemo(
    () => pointsToCatmullRomSpline(currentCumulativePoints),
    [currentCumulativePoints]
  );

  const baselineY = CHART_HEIGHT - PADDING.bottom;
  const inflowAreaPath = useMemo(
    () => pointsToAreaSplinePath(currentInflowPoints, baselineY),
    [currentInflowPoints, baselineY]
  );
  const cumulativeAreaPath = useMemo(
    () => pointsToAreaSplinePath(currentCumulativePoints, baselineY),
    [currentCumulativePoints, baselineY]
  );

  // Touch Scrub Handler
  const handleTouchScrub = (evt: GestureResponderEvent) => {
    const itemsCount = isAnnual ? months.length : days.length;
    if (itemsCount === 0) return;

    const touchX = evt.nativeEvent.locationX;
    const drawableWidth = chartWidth - PADDING.horizontal * 2;
    const stepX = drawableWidth / (itemsCount - 1);

    const rawIndex = (touchX - PADDING.horizontal) / stepX;
    const clampedIndex = Math.min(Math.max(0, Math.round(rawIndex)), itemsCount - 1);

    if (isAnnual) {
      if (clampedIndex !== activeMonthIndex) {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        setActiveMonthIndex(clampedIndex);
      }
    } else {
      if (clampedIndex !== activeDayIndex) {
        if (Platform.OS !== 'web') Haptics.selectionAsync();
        setActiveDayIndex(clampedIndex);
      }
    }
  };

  const activeMonth: AnnualTrajectoryMonth | undefined = months[activeMonthIndex];
  const activeDay: DailyTrajectoryPoint | undefined = days[activeDayIndex];

  const activeX = useMemo(() => {
    if (isAnnual) {
      return (
        annualInflowPoints[activeMonthIndex]?.x ??
        PADDING.horizontal +
          activeMonthIndex *
            ((chartWidth - PADDING.horizontal * 2) / Math.max(months.length - 1, 1))
      );
    } else {
      return (
        dailyInflowPoints[activeDayIndex]?.x ??
        PADDING.horizontal +
          activeDayIndex *
            ((chartWidth - PADDING.horizontal * 2) / Math.max(days.length - 1, 1))
      );
    }
  }, [
    isAnnual,
    annualInflowPoints,
    activeMonthIndex,
    dailyInflowPoints,
    activeDayIndex,
    chartWidth,
    months.length,
    days.length,
  ]);

  // Grid level steps
  const gridLevels = useMemo(() => {
    const range = activeBounds.max - activeBounds.min;
    return [
      { val: activeBounds.max, y: PADDING.top },
      {
        val: activeBounds.min + range * 0.66,
        y: PADDING.top + (CHART_HEIGHT - PADDING.top - PADDING.bottom) * 0.33,
      },
      {
        val: activeBounds.min + range * 0.33,
        y: PADDING.top + (CHART_HEIGHT - PADDING.top - PADDING.bottom) * 0.66,
      },
      { val: activeBounds.min, y: baselineY },
    ];
  }, [activeBounds, baselineY]);

  // Stream Visibility
  const showInflow =
    (!isolatedLine || isolatedLine === 'inflow') &&
    (activeMode === 'unified' || activeMode === 'spread');

  const showOutflow =
    (!isolatedLine || isolatedLine === 'outflow') &&
    (activeMode === 'unified' || activeMode === 'spread');

  const showCumulative =
    (!isolatedLine || isolatedLine === 'cumulative') &&
    (activeMode === 'unified' || activeMode === 'cumulative');

  return (
    <View style={styles.cardContainer}>
      {/* 1. TOP HEADER & NAVIGATION */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.badgeRow}>
            <Text style={styles.badgeDot}>●</Text>
            <Text style={styles.badgeText}>
              {isAnnual ? 'ANNUAL FISCAL ENGINE' : 'CASH VELOCITY ENGINE'}
            </Text>
          </View>
          <Text style={styles.title}>
            {isAnnual ? 'FINANCIAL TRAJECTORY' : dailyData?.monthLabel.toUpperCase()}
          </Text>
        </View>

        {/* Controls: Timeframe / Back to Annual / Month Switcher */}
        <View style={styles.controlsRow}>
          {isAnnual ? (
            <>
              <Pressable
                onPress={() => setTimeframe(timeframe === 'CY' ? 'FY' : 'CY')}
                style={styles.timeframePill}>
                <Text style={styles.timeframePillText}>
                  {timeframe === 'CY' ? 'CALENDAR' : 'FISCAL'}
                </Text>
              </Pressable>

              <View style={styles.selectorWrap}>
                <Pressable
                  onPress={() => {
                    const idx = availableYears.indexOf(year);
                    if (idx < availableYears.length - 1) setYear(availableYears[idx + 1]);
                  }}
                  disabled={availableYears.indexOf(year) >= availableYears.length - 1}
                  style={styles.arrowBtn}
                  hitSlop={8}>
                  <Text style={styles.arrowText}>‹</Text>
                </Pressable>
                <Text style={styles.selectorText}>{year}</Text>
                <Pressable
                  onPress={() => {
                    const idx = availableYears.indexOf(year);
                    if (idx > 0) setYear(availableYears[idx - 1]);
                  }}
                  disabled={availableYears.indexOf(year) <= 0}
                  style={styles.arrowBtn}
                  hitSlop={8}>
                  <Text style={styles.arrowText}>›</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.selectorWrap}>
              <Pressable onPress={goToPrevMonth} style={styles.arrowBtn} hitSlop={8}>
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>
              <Text style={styles.selectorText}>
                {dailyData ? dailyData.monthLabel.split(' ')[0] : 'Month'}
              </Text>
              <Pressable onPress={goToNextMonth} style={styles.arrowBtn} hitSlop={8}>
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* 2. GRANULARITY FILTER TABS (ANNUAL vs 30-DAY DAILY) */}
      <View style={styles.granularityFilterBar}>
        <Pressable
          onPress={backToAnnual}
          style={[
            styles.granularityBtn,
            isAnnual && styles.granularityBtnActive,
          ]}>
          <Text
            style={[
              styles.granularityBtnText,
              isAnnual && styles.granularityBtnTextActive,
            ]}>
            🏛️ Annual (12M)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            const targetMonth = activeMonth ? activeMonth.monthNumber : selectedMonthNumber;
            drillDownToMonth(targetMonth);
          }}
          style={[
            styles.granularityBtn,
            !isAnnual && styles.granularityBtnActive,
          ]}>
          <Text
            style={[
              styles.granularityBtnText,
              !isAnnual && styles.granularityBtnTextActive,
            ]}>
            📅 30-Day Daily ({dailyData?.monthLabel.split(' ')[0] ?? 'Month'})
          </Text>
        </Pressable>
      </View>

      {/* 3. EXECUTIVE KPI STATS CARDS */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>
            {isAnnual ? 'INFLOW (YTD)' : 'TOTAL INFLOW'}
          </Text>
          <Text style={[styles.kpiValue, { color: '#00E676' }]}>
            {formatCompactPaise(
              isAnnual ? annualTotals?.inflowPaise ?? 0 : dailyTotals?.inflowPaise ?? 0
            )}
          </Text>
          <Text style={styles.kpiSub}>
            {isAnnual
              ? `Peak: ${annualTotals?.peakInflowMonth ?? '—'}`
              : `Day ${dailyTotals?.peakInflowDay ?? 1}`}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>
            {isAnnual ? 'TOTAL BURN (YTD)' : 'TOTAL OUTFLOW'}
          </Text>
          <Text style={[styles.kpiValue, { color: '#FF8A00' }]}>
            {formatCompactPaise(
              isAnnual ? annualTotals?.outflowPaise ?? 0 : dailyTotals?.outflowPaise ?? 0
            )}
          </Text>
          <Text style={styles.kpiSub}>
            {isAnnual
              ? `Peak: ${annualTotals?.peakOutflowMonth ?? '—'}`
              : `Day ${dailyTotals?.peakOutflowDay ?? 1}`}
          </Text>
        </View>

        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>
            {isAnnual ? 'NET CUMULATIVE' : 'NET SURPLUS'}
          </Text>
          <Text style={[styles.kpiValue, { color: '#00F0FF' }]}>
            {formatCompactPaise(
              isAnnual
                ? annualTotals?.cumulativeSavingsPaise ?? 0
                : dailyTotals?.netSavingsPaise ?? 0
            )}
          </Text>
          <Text style={styles.kpiSubGreen}>
            {isAnnual
              ? `🟢 ${annualTotals?.savingsRatePercent ?? 0}% Saved`
              : `Active: ${dailyTotals?.activeDaysCount ?? 0} Days`}
          </Text>
        </View>
      </View>

      {/* 4. MULTI-MODE TABS (Unified / Spread / Cumulative) */}
      <View style={styles.modeTabBar}>
        {(
          [
            { key: 'unified', label: '⚡ Unified View' },
            { key: 'spread', label: '⚖️ Spread Margin' },
            { key: 'cumulative', label: '💎 Cumulative Net' },
          ] as { key: TrajectoryMode; label: string }[]
        ).map((tab) => {
          const isActive = activeMode === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveMode(tab.key)}
              style={[styles.modeTabBtn, isActive && styles.modeTabBtnActive]}>
              <Text style={[styles.modeTabText, isActive && styles.modeTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 5. INTERACTIVE LEGEND ISOLATION ROW */}
      <View style={styles.legendRow}>
        <Text style={styles.legendPrompt}>Toggle lines:</Text>

        <Pressable
          onPress={() => toggleLineIsolation('inflow')}
          style={[styles.legendPill, isolatedLine === 'inflow' && styles.legendPillActive]}>
          <View style={[styles.legendDot, { backgroundColor: '#00E676' }]} />
          <Text style={styles.legendPillText}>Inflow</Text>
        </Pressable>

        <Pressable
          onPress={() => toggleLineIsolation('outflow')}
          style={[styles.legendPill, isolatedLine === 'outflow' && styles.legendPillActive]}>
          <View style={[styles.legendDot, { backgroundColor: '#FF8A00' }]} />
          <Text style={styles.legendPillText}>Outflow</Text>
        </Pressable>

        <Pressable
          onPress={() => toggleLineIsolation('cumulative')}
          style={[
            styles.legendPill,
            isolatedLine === 'cumulative' && styles.legendPillActive,
          ]}>
          <View style={[styles.legendDot, { backgroundColor: '#00F0FF' }]} />
          <Text style={styles.legendPillText}>Cumulative</Text>
        </Pressable>
      </View>

      {/* 6. INTERACTIVE TOUCH CANVAS & SVG SPLINES */}
      <View
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchScrub}
        onResponderMove={handleTouchScrub}
        style={styles.chartWrapper}>
        {loading ? (
          <View style={styles.chartLoader}>
            <ActivityIndicator size="small" color="#00F0FF" />
          </View>
        ) : (
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#00E676" stopOpacity="0.18" />
                <Stop offset="100%" stopColor="#00E676" stopOpacity="0.0" />
              </LinearGradient>

              <LinearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#00F0FF" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="#00F0FF" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Dotted Grid Horizontal Guides */}
            {gridLevels.map((lvl, idx) => (
              <G key={`grid_${idx}`}>
                <Line
                  x1={PADDING.horizontal}
                  y1={lvl.y}
                  x2={chartWidth - PADDING.horizontal}
                  y2={lvl.y}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
                <SvgText
                  x={PADDING.horizontal}
                  y={lvl.y - 4}
                  fill="rgba(255, 255, 255, 0.32)"
                  fontSize="9"
                  fontWeight="700">
                  {formatCompactPaise(lvl.val)}
                </SvgText>
              </G>
            ))}

            {/* Area Fills */}
            {showInflow && inflowAreaPath ? (
              <Path d={inflowAreaPath} fill="url(#inflowGrad)" />
            ) : null}

            {showCumulative && cumulativeAreaPath ? (
              <Path d={cumulativeAreaPath} fill="url(#cumGrad)" />
            ) : null}

            {/* Curves */}
            {showInflow && inflowPath ? (
              <Path
                d={inflowPath}
                stroke="#00E676"
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
              />
            ) : null}

            {showOutflow && outflowPath ? (
              <Path
                d={outflowPath}
                stroke="#FF8A00"
                strokeWidth={2.2}
                fill="none"
                strokeLinecap="round"
              />
            ) : null}

            {showCumulative && cumulativePath ? (
              <Path
                d={cumulativePath}
                stroke="#00F0FF"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
            ) : null}

            {/*
              SMALL, NEAT, CLEAN DOTS (MATCHING USER'S EXACT INSTRUCTION)
              Zero/inactive days show subtle micro-dots; active points get crisp glowing circles.
            */}
            {/* A. Outflow Dots */}
            {showOutflow &&
              currentOutflowPoints.map((pt, idx) => {
                const isSelected = isAnnual ? idx === activeMonthIndex : idx === activeDayIndex;
                const hasValue = isAnnual
                  ? (months[idx]?.outflowPaise ?? 0) > 0
                  : (days[idx]?.outflowPaise ?? 0) > 0;

                if (!hasValue && !isSelected) {
                  return (
                    <Circle
                      key={`outflow_dot_${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={1.2}
                      fill="rgba(255, 138, 0, 0.35)"
                    />
                  );
                }

                return (
                  <G key={`outflow_dot_${idx}`}>
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 4.8 : 3.0}
                      fill="rgba(255, 138, 0, 0.22)"
                    />
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 2.8 : 2.0}
                      fill="#FF8A00"
                    />
                    <Circle cx={pt.x} cy={pt.y} r={1.0} fill="#FFFFFF" />
                  </G>
                );
              })}

            {/* B. Inflow Dots */}
            {showInflow &&
              currentInflowPoints.map((pt, idx) => {
                const isSelected = isAnnual ? idx === activeMonthIndex : idx === activeDayIndex;
                const hasValue = isAnnual
                  ? (months[idx]?.inflowPaise ?? 0) > 0
                  : (days[idx]?.inflowPaise ?? 0) > 0;

                if (!hasValue && !isSelected) {
                  return (
                    <Circle
                      key={`inflow_dot_${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={1.2}
                      fill="rgba(0, 230, 118, 0.35)"
                    />
                  );
                }

                return (
                  <G key={`inflow_dot_${idx}`}>
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 4.8 : 3.0}
                      fill="rgba(0, 230, 118, 0.22)"
                    />
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 2.8 : 2.0}
                      fill="#00E676"
                    />
                    <Circle cx={pt.x} cy={pt.y} r={1.0} fill="#FFFFFF" />
                  </G>
                );
              })}

            {/* C. Cumulative Dots */}
            {showCumulative &&
              currentCumulativePoints.map((pt, idx) => {
                const isSelected = isAnnual ? idx === activeMonthIndex : idx === activeDayIndex;
                const hasValue = isAnnual
                  ? (months[idx]?.cumulativeSavingsPaise ?? 0) !== 0
                  : (days[idx]?.cumulativeSavingsPaise ?? 0) !== 0;

                if (!hasValue && !isSelected) {
                  return (
                    <Circle
                      key={`cum_dot_${idx}`}
                      cx={pt.x}
                      cy={pt.y}
                      r={1.2}
                      fill="rgba(0, 240, 255, 0.35)"
                    />
                  );
                }

                return (
                  <G key={`cum_dot_${idx}`}>
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 5.2 : 3.2}
                      fill="rgba(0, 240, 255, 0.25)"
                    />
                    <Circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 3.0 : 2.2}
                      fill="#00F0FF"
                    />
                    <Circle cx={pt.x} cy={pt.y} r={1.0} fill="#FFFFFF" />
                  </G>
                );
              })}

            {/* Laser Scrub Line */}
            <Line
              x1={activeX}
              y1={PADDING.top - 6}
              x2={activeX}
              y2={baselineY + 4}
              stroke="#00F0FF"
              strokeWidth={1.5}
              strokeDasharray="4,4"
              opacity={0.8}
            />
            <Circle cx={activeX} cy={baselineY} r={2.8} fill="#00F0FF" />
          </Svg>
        )}

        {/* X-AXIS LABELS */}
        {isAnnual ? (
          <View style={styles.xAxisRow}>
            {months.map((m, idx) => {
              const isSelected = idx === activeMonthIndex;
              return (
                <Pressable
                  key={m.monthName}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    setActiveMonthIndex(idx);
                  }}
                  style={styles.xTouch}>
                  <Text style={[styles.xText, isSelected && styles.xTextActive]}>
                    {m.monthName}
                  </Text>
                  {isSelected ? <View style={styles.xActivePill} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.xAxisRow}>
            {days
              .filter(
                (d) =>
                  d.dayNumber === 1 ||
                  d.dayNumber % 5 === 0 ||
                  d.dayNumber === days.length
              )
              .map((d) => {
                const isSelected = d.dayNumber - 1 === activeDayIndex;
                return (
                  <Pressable
                    key={`day_lbl_${d.dayNumber}`}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      setActiveDayIndex(d.dayNumber - 1);
                    }}
                    style={styles.xTouch}>
                    <Text style={[styles.xText, isSelected && styles.xTextActive]}>
                      {d.dayNumber}
                    </Text>
                    {isSelected ? <View style={styles.xActivePill} /> : null}
                  </Pressable>
                );
              })}
          </View>
        )}
      </View>

      {/* 7. DYNAMIC HUD TOOLTIP INSPECTOR */}
      {isAnnual && activeMonth ? (
        <View style={styles.hudTooltipContainer}>
          <View style={styles.hudHeader}>
            <View style={styles.hudTitleRow}>
              <Text style={styles.hudPinIcon}>📍</Text>
              <Text style={styles.hudTitle}>{activeMonth.fullLabel.toUpperCase()}</Text>
            </View>
            <View style={styles.hudBadge}>
              <Text style={styles.hudBadgeText}>
                {activeMonth.transactionCount} transactions
              </Text>
            </View>
          </View>

          <View style={styles.hudGrid}>
            <View style={styles.hudStatBox}>
              <Text style={styles.hudStatLabel}>INFLOW</Text>
              <Text style={[styles.hudStatValue, { color: '#00E676' }]}>
                +{formatPaise(activeMonth.inflowPaise)}
              </Text>
            </View>

            <View style={styles.hudStatBox}>
              <Text style={styles.hudStatLabel}>OUTFLOW</Text>
              <Text style={[styles.hudStatValue, { color: '#FF8A00' }]}>
                -{formatPaise(activeMonth.outflowPaise)}
              </Text>
            </View>

            <View style={styles.hudStatBox}>
              <Text style={styles.hudStatLabel}>MONTH NET</Text>
              <Text
                style={[
                  styles.hudStatValue,
                  {
                    color:
                      activeMonth.netSavingsPaise >= 0 ? '#00E676' : '#FF5252',
                  },
                ]}>
                {activeMonth.netSavingsPaise >= 0 ? '+' : ''}
                {formatPaise(activeMonth.netSavingsPaise)}
              </Text>
            </View>

            <View style={styles.hudStatBox}>
              <Text style={styles.hudStatLabel}>CUMULATIVE</Text>
              <Text style={[styles.hudStatValue, { color: '#00F0FF' }]}>
                {formatPaise(activeMonth.cumulativeSavingsPaise)}
              </Text>
            </View>
          </View>

          {/* Drill Down Action Button */}
          <Pressable
            onPress={() => drillDownToMonth(activeMonth.monthNumber)}
            style={styles.drillDownBtn}>
            <Text style={styles.drillDownBtnText}>
              ⚡ View 30-Day Daily Breakdown ({activeMonth.monthName} 1-30) ➔
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!isAnnual && activeDay ? (
        <View style={styles.hudTooltipContainer}>
          <View style={styles.hudHeader}>
            <View style={styles.hudTitleRow}>
              <Text style={styles.hudPinIcon}>📍</Text>
              <Text style={styles.hudTitle}>
                {activeDay.fullLabel.toUpperCase()} ({activeDay.dayOfWeek})
              </Text>
            </View>
            <View style={styles.hudBadge}>
              <Text style={styles.hudBadgeText}>
                {activeDay.transactionCount} transactions
              </Text>
            </View>
          </View>

          <View style={styles.hudGrid}>
            <View style={styles.hudStatBox}>
              <Text style={styles.hudStatLabel}>SPENT</Text>
              <Text style={[styles.hudStatValue, { color: '#FF8A00' }]}>
                {activeDay.outflowPaise > 0
                  ? `-${formatPaise(activeDay.outflowPaise)}`
                  : '₹0'}
              </Text>
            </View>

            <View style={styles.hudStatBox}>
              <Text style={styles.hudStatLabel}>RECEIVED</Text>
              <Text style={[styles.hudStatValue, { color: '#00E676' }]}>
                {activeDay.inflowPaise > 0
                  ? `+${formatPaise(activeDay.inflowPaise)}`
                  : '₹0'}
              </Text>
            </View>

            <View style={styles.hudStatBox}>
              <Text style={styles.hudStatLabel}>DAILY NET</Text>
              <Text
                style={[
                  styles.hudStatValue,
                  {
                    color:
                      activeDay.netSavingsPaise >= 0 ? '#00E676' : '#FF5252',
                  },
                ]}>
                {activeDay.netSavingsPaise >= 0 ? '+' : ''}
                {formatPaise(activeDay.netSavingsPaise)}
              </Text>
            </View>

            <View style={styles.hudStatBox}>
              <Text style={styles.hudStatLabel}>TOP MERCHANT</Text>
              <Text style={[styles.hudStatValue, { color: '#FFFFFF' }]} numberOfLines={1}>
                {activeDay.topMerchant || 'No Spends'}
              </Text>
            </View>
          </View>

          {/* Quick Return to Annual View */}
          <Pressable onPress={backToAnnual} style={styles.returnAnnualBtn}>
            <Text style={styles.returnAnnualBtnText}>‹ Back to Annual 12-Month Matrix</Text>
          </Pressable>
        </View>
      ) : null}

      {/* 8. AUDIT FOOTER */}
      <View style={styles.footerSeal}>
        <Text style={styles.footerText}>
          ⚡ 100% On-Device SQL Aggregations • Zero Cloud Telemetry • AES-256 Protected
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#090D16',
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 18,
    gap: 13,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    color: '#00F0FF',
    fontSize: 9,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  controlsRow: {
    alignItems: 'flex-end',
    gap: 6,
  },
  timeframePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 0.8,
    borderColor: '#00F0FF',
  },
  timeframePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.6,
  },
  selectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121927',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  arrowBtn: {
    paddingHorizontal: 4,
  },
  arrowText: {
    color: '#00F0FF',
    fontSize: 15,
    fontWeight: '700',
  },
  selectorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  granularityFilterBar: {
    flexDirection: 'row',
    backgroundColor: '#0E1422',
    borderRadius: 12,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  granularityBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  granularityBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.18)',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  granularityBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#65738E',
  },
  granularityBtnTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#0F1626',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 3,
  },
  kpiLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#8A96AD',
    letterSpacing: 0.6,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  kpiSub: {
    fontSize: 8.5,
    color: '#65738E',
    fontWeight: '600',
  },
  kpiSubGreen: {
    fontSize: 8.5,
    color: '#00E676',
    fontWeight: '700',
  },
  modeTabBar: {
    flexDirection: 'row',
    backgroundColor: '#0E1422',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  modeTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 9,
  },
  modeTabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modeTabText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#65738E',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  legendPrompt: {
    fontSize: 10,
    color: '#65738E',
    fontWeight: '600',
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1422',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 5,
  },
  legendPillActive: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendPillText: {
    fontSize: 9.5,
    color: '#8A96AD',
    fontWeight: '700',
  },
  chartWrapper: {
    backgroundColor: '#060A12',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  chartLoader: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PADDING.horizontal - 8,
    paddingTop: 6,
    paddingBottom: 8,
  },
  xTouch: {
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 3,
  },
  xText: {
    fontSize: 9.5,
    color: '#65738E',
    fontWeight: '700',
  },
  xTextActive: {
    color: '#00F0FF',
    fontWeight: '900',
  },
  xActivePill: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00F0FF',
  },
  hudTooltipContainer: {
    backgroundColor: '#101726',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    gap: 8,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudPinIcon: {
    fontSize: 12,
  },
  hudTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  hudBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  hudBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A96AD',
  },
  hudGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  hudStatBox: {
    flex: 1,
    backgroundColor: '#090D16',
    borderRadius: 10,
    padding: 7,
    gap: 2,
  },
  hudStatLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.5,
  },
  hudStatValue: {
    fontSize: 11,
    fontWeight: '900',
  },
  drillDownBtn: {
    marginTop: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  drillDownBtnText: {
    color: '#00F0FF',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  returnAnnualBtn: {
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  returnAnnualBtnText: {
    color: '#8A96AD',
    fontSize: 10,
    fontWeight: '700',
  },
  footerSeal: {
    alignItems: 'center',
    paddingTop: 2,
  },
  footerText: {
    fontSize: 8.5,
    color: '#475569',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
