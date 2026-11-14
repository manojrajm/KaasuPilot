import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CalendarDateModalProps {
  visible: boolean;
  initialDate?: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  onSelectFullMonth: (year: number, monthIndex: number) => void;
}

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
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

export function CalendarDateModal({
  visible,
  initialDate,
  onClose,
  onSelectDate,
  onSelectFullMonth,
}: CalendarDateModalProps) {
  const insets = useSafeAreaInsets();
  const today = new Date();

  // Selected viewing year and month
  const [viewYear, setViewYear] = useState<number>(() =>
    initialDate ? initialDate.getFullYear() : today.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(() =>
    initialDate ? initialDate.getMonth() : today.getMonth()
  );

  // Month grid calculations
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayPress = (dayNum: number) => {
    const selected = new Date(viewYear, viewMonth, dayNum, 12, 0, 0);
    onSelectDate(selected);
    onClose();
  };

  const handleSelectToday = () => {
    onSelectDate(today);
    onClose();
  };

  const handleSelectMonth = () => {
    onSelectFullMonth(viewYear, viewMonth);
    onClose();
  };

  // Check if a day is today
  const isDayToday = (dayNum: number) => {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === dayNum
    );
  };

  // Check if a day is currently selected
  const isDaySelected = (dayNum: number) => {
    if (!initialDate) return false;
    return (
      initialDate.getFullYear() === viewYear &&
      initialDate.getMonth() === viewMonth &&
      initialDate.getDate() === dayNum
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
          {/* Top Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.badgeIcon}>📅</Text>
                <Text style={styles.badgeText}>CALENDAR TELEMETRY</Text>
              </View>
              <Text style={styles.title}>Select Specific Date</Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Month & Year Stepper */}
          <View style={styles.navBar}>
            <Pressable onPress={handlePrevMonth} style={styles.arrowBtn} hitSlop={8}>
              <Text style={styles.arrowText}>◀</Text>
            </Pressable>

            <View style={styles.monthHeader}>
              <Text style={styles.monthTitle}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Text style={styles.monthSub}>Tap any day to inspect ledger</Text>
            </View>

            <Pressable onPress={handleNextMonth} style={styles.arrowBtn} hitSlop={8}>
              <Text style={styles.arrowText}>▶</Text>
            </Pressable>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={styles.weekdayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Matrix */}
          <View style={styles.daysGrid}>
            {/* Blank leading slots */}
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <View key={`empty-${idx}`} style={styles.daySlotEmpty} />
            ))}

            {/* Days of month */}
            {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isToday = isDayToday(dayNum);
              const isSelected = isDaySelected(dayNum);

              return (
                <Pressable
                  key={`day-${dayNum}`}
                  onPress={() => handleDayPress(dayNum)}
                  style={({ pressed }) => [
                    styles.daySlot,
                    isToday && styles.daySlotToday,
                    isSelected && styles.daySlotSelected,
                    pressed && styles.daySlotPressed,
                  ]}>
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.dayTextToday,
                      isSelected && styles.dayTextSelected,
                    ]}>
                    {dayNum}
                  </Text>
                  {isToday && !isSelected ? <View style={styles.todayDot} /> : null}
                </Pressable>
              );
            })}
          </View>

          {/* Quick Action Shortcuts Footer */}
          <View style={styles.shortcutsRow}>
            <Pressable onPress={handleSelectToday} style={styles.shortcutBtn}>
              <Text style={styles.shortcutBtnText}>⚡ Jump to Today</Text>
            </Pressable>

            <Pressable onPress={handleSelectMonth} style={[styles.shortcutBtn, styles.shortcutBtnSecondary]}>
              <Text style={[styles.shortcutBtnText, styles.shortcutBtnTextSecondary]}>
                🗓️ Full Month ({MONTH_NAMES[viewMonth].slice(0, 3)})
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#0A0D14',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dragHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeIcon: {
    fontSize: 10,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#8A96AD',
    fontSize: 14,
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F131C',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  monthHeader: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  monthSub: {
    fontSize: 9.5,
    color: '#65738E',
    marginTop: 1,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  weekdayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  daySlotEmpty: {
    width: '14.28%',
    height: 42,
  },
  daySlot: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  daySlotToday: {
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
  },
  daySlotSelected: {
    backgroundColor: '#00F0FF',
  },
  daySlotPressed: {
    opacity: 0.6,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DCE4F0',
  },
  dayTextToday: {
    color: '#FFD700',
    fontWeight: '900',
  },
  dayTextSelected: {
    color: '#07090E',
    fontWeight: '900',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    position: 'absolute',
    bottom: 4,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  shortcutBtnSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  shortcutBtnText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '800',
  },
  shortcutBtnTextSecondary: {
    color: '#DCE4F0',
  },
});
