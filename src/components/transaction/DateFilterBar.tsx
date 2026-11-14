import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CalendarDateModal } from './CalendarDateModal';

export type DateFilterPreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'all_time'
  | 'custom';

export interface DateFilterRange {
  startDate?: string;
  endDate?: string;
  scopeLabel: string;
  preset: DateFilterPreset;
}

interface DateFilterBarProps {
  currentFilter: DateFilterRange;
  onFilterChange: (filter: DateFilterRange) => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function computeFilterRange(preset: DateFilterPreset, offsetMonth = 0): DateFilterRange {
  const now = new Date();

  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return {
      preset: 'today',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      scopeLabel: `Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`,
    };
  }

  if (preset === 'this_week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999);
    return {
      preset: 'this_week',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      scopeLabel: `This Week (${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`,
    };
  }

  if (preset === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return {
      preset: 'last_month',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      scopeLabel: `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`,
    };
  }

  if (preset === 'all_time') {
    return {
      preset: 'all_time',
      startDate: undefined,
      endDate: undefined,
      scopeLabel: 'All Time Ledger',
    };
  }

  // Default: this_month with optional offset
  const targetYear = now.getFullYear();
  const targetMonth = now.getMonth() + offsetMonth;
  const start = new Date(targetYear, targetMonth, 1, 0, 0, 0);
  const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
  return {
    preset: 'this_month',
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    scopeLabel: `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`,
  };
}

export function DateFilterBar({ currentFilter, onFilterChange }: DateFilterBarProps) {
  const [activeMonthOffset, setActiveMonthOffset] = useState<number>(0);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

  const presets: { id: DateFilterPreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'custom', label: '📅 Pick Date' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'all_time', label: 'All Time' },
  ];

  const handleSelectPreset = (preset: DateFilterPreset) => {
    if (preset === 'custom') {
      setShowCalendarModal(true);
      return;
    }
    setActiveMonthOffset(0);
    onFilterChange(computeFilterRange(preset, 0));
  };

  const handlePrevMonth = () => {
    const nextOffset = activeMonthOffset - 1;
    setActiveMonthOffset(nextOffset);
    onFilterChange(computeFilterRange('this_month', nextOffset));
  };

  const handleNextMonth = () => {
    const nextOffset = activeMonthOffset + 1;
    setActiveMonthOffset(nextOffset);
    onFilterChange(computeFilterRange('this_month', nextOffset));
  };

  // Called when user selects a specific day on the calendar grid
  const handleSelectParticularDate = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    onFilterChange({
      preset: 'custom',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      scopeLabel: date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    });
  };

  // Called when user selects full month in the modal
  const handleSelectFullMonthFromModal = (year: number, monthIndex: number) => {
    const start = new Date(year, monthIndex, 1, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    onFilterChange({
      preset: 'this_month',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      scopeLabel: `${MONTH_NAMES[monthIndex]} ${year}`,
    });
  };

  const initialCalendarDate = currentFilter.startDate
    ? new Date(currentFilter.startDate)
    : new Date();

  return (
    <View style={styles.container}>
      {/* Horizontal Sliding Preset Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsScroll}>
        {presets.map((p) => {
          const isSelected =
            currentFilter.preset === p.id &&
            (p.id !== 'this_month' || activeMonthOffset === 0);

          return (
            <Pressable
              key={p.id}
              onPress={() => handleSelectPreset(p.id)}
              style={[styles.presetChip, isSelected && styles.presetChipActive]}>
              <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Month & Date Stepper Bar - Center button opens Calendar */}
      <View style={styles.stepperRow}>
        <Pressable onPress={handlePrevMonth} style={styles.stepBtn} hitSlop={8}>
          <Text style={styles.stepArrow}>◀</Text>
        </Pressable>

        <Pressable
          onPress={() => setShowCalendarModal(true)}
          style={({ pressed }) => [styles.centerScope, pressed && styles.centerScopePressed]}>
          <Text style={styles.scopeIcon}>📅</Text>
          <Text style={styles.scopeTitle} numberOfLines={1}>
            {currentFilter.scopeLabel.toUpperCase()}
          </Text>
          <Text style={styles.dropdownCaret}>▾</Text>
        </Pressable>

        <Pressable
          onPress={handleNextMonth}
          disabled={activeMonthOffset >= 0 && currentFilter.preset === 'this_month'}
          style={[
            styles.stepBtn,
            activeMonthOffset >= 0 &&
              currentFilter.preset === 'this_month' &&
              styles.stepBtnDisabled,
          ]}
          hitSlop={8}>
          <Text style={styles.stepArrow}>▶</Text>
        </Pressable>
      </View>

      {/* Calendar Date Picker Modal */}
      <CalendarDateModal
        visible={showCalendarModal}
        initialDate={initialCalendarDate}
        onClose={() => setShowCalendarModal(false)}
        onSelectDate={handleSelectParticularDate}
        onSelectFullMonth={handleSelectFullMonthFromModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  presetsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    backgroundColor: '#0F1420',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8A96AD',
  },
  presetChipTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B0E15',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepArrow: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '900',
  },
  centerScope: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    maxWidth: '75%',
  },
  centerScopePressed: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  scopeIcon: {
    fontSize: 12,
  },
  scopeTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  dropdownCaret: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '900',
  },
});
