import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { DueCalendarEvent } from '@/domain/types';
import { formatPaise } from '@/domain/money/format';

interface DueDatesCalendarProps {
  events: DueCalendarEvent[];
  selectedYear: number;
  selectedMonthIndex: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onMarkPaid: (eventId: string, sourceId: string) => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

export function DueDatesCalendar({
  events,
  selectedYear,
  selectedMonthIndex,
  onPrevMonth,
  onNextMonth,
  onMarkPaid,
}: DueDatesCalendarProps) {
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === selectedYear && today.getMonth() === selectedMonthIndex;
  const currentDay = today.getDate();

  // Selected day in calendar (defaults to today or first event day)
  const defaultDay = useMemo(() => {
    if (isCurrentMonth) return currentDay;
    if (events.length > 0) return events[0].dayOfMonth;
    return 1;
  }, [isCurrentMonth, currentDay, events]);

  const [selectedDay, setSelectedDay] = useState<number>(defaultDay);

  // Month grid calculations
  const totalDays = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonthIndex, 1).getDay();

  // Map events by day of month
  const eventsByDay = useMemo(() => {
    const map = new Map<number, DueCalendarEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.dayOfMonth) || [];
      list.push(ev);
      map.set(ev.dayOfMonth, list);
    });
    return map;
  }, [events]);

  // Total monthly outflow metrics
  const monthlyMetrics = useMemo(() => {
    const totalOutflow = events.reduce((sum, e) => sum + e.amountPaise, 0);
    const paidOutflow = events
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + e.amountPaise, 0);
    const pendingOutflow = totalOutflow - paidOutflow;
    return { totalOutflow, paidOutflow, pendingOutflow, count: events.length };
  }, [events]);

  // Events for currently selected date
  const selectedDayEvents = eventsByDay.get(selectedDay) || [];

  return (
    <View style={styles.calendarContainer}>
      {/* 1. Header Bar: Month Navigator & Monthly Telemetry */}
      <View style={styles.headerBar}>
        <View style={styles.monthSelector}>
          <Pressable onPress={onPrevMonth} style={styles.navArrowBtn} hitSlop={10}>
            <Text style={styles.navArrowText}>◀</Text>
          </Pressable>

          <View style={styles.monthTextContainer}>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
            </Text>
            <Text style={styles.monthSubtitle}>
              {events.length} DUE DATES SCHEDULED
            </Text>
          </View>

          <Pressable onPress={onNextMonth} style={styles.navArrowBtn} hitSlop={10}>
            <Text style={styles.navArrowText}>▶</Text>
          </Pressable>
        </View>

        {/* Monthly Outflow Metrics Pod */}
        <View style={styles.metricsPod}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TOTAL DUE</Text>
            <Text style={styles.metricValue}>
              {formatPaise(monthlyMetrics.totalOutflow)}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>REMAINING</Text>
            <Text style={[styles.metricValue, styles.pendingValue]}>
              {formatPaise(monthlyMetrics.pendingOutflow)}
            </Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>PAID</Text>
            <Text style={[styles.metricValue, styles.paidValue]}>
              {formatPaise(monthlyMetrics.paidOutflow)}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Calendar Matrix (Sun - Sat Grid) */}
      <View style={styles.matrixContainer}>
        {/* Weekday Row */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayText}>
              {day}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {/* Leading blank slots */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <View key={`empty-${idx}`} style={styles.daySlotEmpty} />
          ))}

          {/* Month Days */}
          {Array.from({ length: totalDays }).map((_, idx) => {
            const dayNum = idx + 1;
            const dayEvents = eventsByDay.get(dayNum) || [];
            const hasEvents = dayEvents.length > 0;
            const isToday = isCurrentMonth && dayNum === currentDay;
            const isSelected = dayNum === selectedDay;

            const hasPendingLoan = dayEvents.some(
              (e) => e.type === 'loan_emi' && e.status === 'pending'
            );
            const hasPendingCard = dayEvents.some(
              (e) => e.type === 'credit_card' && e.status === 'pending'
            );
            const isAllPaid = hasEvents && dayEvents.every((e) => e.status === 'paid');

            return (
              <Pressable
                key={`day-${dayNum}`}
                onPress={() => setSelectedDay(dayNum)}
                style={[
                  styles.daySlot,
                  isToday && styles.daySlotToday,
                  isSelected && styles.daySlotSelected,
                  hasEvents && !isSelected && styles.daySlotWithDues,
                ]}>
                <Text
                  style={[
                    styles.dayNumberText,
                    isToday && styles.dayNumberToday,
                    isSelected && styles.dayNumberSelected,
                  ]}>
                  {dayNum}
                </Text>

                {/* Telemetry Dots */}
                {hasEvents ? (
                  <View style={styles.dotsRow}>
                    {hasPendingLoan && <View style={styles.dotLoan} />}
                    {hasPendingCard && <View style={styles.dotCard} />}
                    {isAllPaid && <View style={styles.dotPaid} />}
                  </View>
                ) : (
                  <View style={styles.dotsPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Color Legend Bar */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.dotLoan} />
            <Text style={styles.legendText}>Loan EMI</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.dotCard} />
            <Text style={styles.legendText}>Card Due</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.dotPaid} />
            <Text style={styles.legendText}>Reconciled</Text>
          </View>
        </View>
      </View>

      {/* 3. Selected Date Dues Detail Card & Action */}
      <View style={styles.selectedDayCard}>
        <View style={styles.selectedDayHeader}>
          <Text style={styles.selectedDayTitle}>
            📅 {selectedDay} {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
          </Text>
          <Text style={styles.selectedDayCount}>
            {selectedDayEvents.length} Outflows Due
          </Text>
        </View>

        {selectedDayEvents.length === 0 ? (
          <View style={styles.noDuesContainer}>
            <Text style={styles.noDuesEmoji}>✨</Text>
            <Text style={styles.noDuesText}>
              No scheduled EMI or card payments due on this date.
            </Text>
          </View>
        ) : (
          selectedDayEvents.map((ev) => {
            const isLoan = ev.type === 'loan_emi';
            const isPaid = ev.status === 'paid';

            return (
              <View
                key={ev.id}
                style={[
                  styles.eventRow,
                  isPaid && styles.eventRowPaid,
                ]}>
                <View style={styles.eventLeft}>
                  <View
                    style={[
                      styles.eventIconBox,
                      isLoan ? styles.eventIconLoan : styles.eventIconCard,
                    ]}>
                    <Text style={styles.eventIconText}>
                      {isLoan ? '🏦' : '💳'}
                    </Text>
                  </View>

                  <View style={styles.eventMeta}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <Text style={styles.eventLender}>
                      {ev.lenderOrMerchant} • Due on {ev.dayOfMonth}th
                    </Text>
                  </View>
                </View>

                <View style={styles.eventRight}>
                  <Text
                    style={[
                      styles.eventAmount,
                      isPaid && styles.eventAmountPaid,
                    ]}>
                    {formatPaise(ev.amountPaise)}
                  </Text>

                  {isPaid ? (
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>✓ RECONCILED</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => onMarkPaid(ev.id, ev.sourceId)}
                      style={({ pressed }) => [
                        styles.markPaidBtn,
                        pressed && styles.btnPressed,
                      ]}>
                      <Text style={styles.markPaidBtnText}>⚡ Mark Paid</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
    gap: 14,
    width: '100%',
  },
  headerBar: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navArrowText: {
    fontSize: 13,
    color: '#FFB800',
    fontWeight: '800',
  },
  monthTextContainer: {
    alignItems: 'center',
    gap: 2,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  monthSubtitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  metricsPod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#07090E',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pendingValue: {
    color: '#FFB800',
  },
  paidValue: {
    color: '#00E676',
  },
  matrixContainer: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 8,
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    width: 38,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 8,
  },
  daySlot: {
    width: 38,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  daySlotEmpty: {
    width: 38,
    height: 48,
  },
  daySlotToday: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  daySlotSelected: {
    backgroundColor: 'rgba(255, 184, 0, 0.18)',
    borderColor: '#FFB800',
    borderWidth: 1.5,
  },
  daySlotWithDues: {
    backgroundColor: 'rgba(255, 59, 48, 0.06)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  dayNumberText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  dayNumberToday: {
    color: '#00F0FF',
    fontWeight: '900',
  },
  dayNumberSelected: {
    color: '#FFB800',
    fontWeight: '900',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
  },
  dotsPlaceholder: {
    height: 6,
  },
  dotLoan: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FF3B30',
  },
  dotCard: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFB800',
  },
  dotPaid: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  selectedDayCard: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  selectedDayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  selectedDayCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFB800',
  },
  noDuesContainer: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  noDuesEmoji: {
    fontSize: 22,
  },
  noDuesText: {
    fontSize: 12,
    color: '#65738E',
    textAlign: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#07090E',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  eventRowPaid: {
    opacity: 0.7,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  eventIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventIconLoan: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  eventIconCard: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  eventIconText: {
    fontSize: 16,
  },
  eventMeta: {
    gap: 2,
    flex: 1,
  },
  eventTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  eventLender: {
    fontSize: 10.5,
    color: '#8E9BB0',
  },
  eventRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  eventAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  eventAmountPaid: {
    color: '#00E676',
  },
  paidBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  paidBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#00E676',
  },
  markPaidBtn: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFB800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  markPaidBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFB800',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
