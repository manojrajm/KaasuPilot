import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Loan } from '@/domain/types';
import { generateAmortisationSchedule } from '@/domain/loans/amortisation';
import { formatPaise } from '@/domain/money/format';

interface AmortisationModalProps {
  visible: boolean;
  loan: Loan | null;
  onClose: () => void;
}

export function AmortisationModal({
  visible,
  loan,
  onClose,
}: AmortisationModalProps) {
  const schedule = useMemo(() => {
    if (!loan) return [];
    return generateAmortisationSchedule(loan);
  }, [loan]);

  if (!visible || !loan) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>AMORTISATION SCHEDULE</Text>
              <Text style={styles.headerSubtitle}>
                {loan.name} • {loan.tenureMonths} Months Schedule
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Table Header Row */}
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, styles.colNo]}>#</Text>
            <Text style={[styles.thText, styles.colPrincipal]}>PRINCIPAL</Text>
            <Text style={[styles.thText, styles.colInterest]}>INTEREST</Text>
            <Text style={[styles.thText, styles.colBalance]}>BALANCE</Text>
          </View>

          {/* Schedule List */}
          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.tableBody}>
            {schedule.map((entry) => {
              const isPaid = entry.status === 'paid';
              return (
                <View
                  key={entry.installmentNumber}
                  style={[styles.tableRow, isPaid && styles.tableRowPaid]}>
                  <Text style={[styles.tdText, styles.colNo, isPaid && styles.tdPaid]}>
                    {entry.installmentNumber}
                  </Text>
                  <Text
                    style={[
                      styles.tdText,
                      styles.colPrincipal,
                      isPaid && styles.tdPaid,
                    ]}>
                    {formatPaise(entry.principalComponentPaise)}
                  </Text>
                  <Text
                    style={[
                      styles.tdText,
                      styles.colInterest,
                      styles.tdInterest,
                      isPaid && styles.tdPaid,
                    ]}>
                    {formatPaise(entry.interestComponentPaise)}
                  </Text>
                  <Text
                    style={[
                      styles.tdText,
                      styles.colBalance,
                      styles.tdBalance,
                      isPaid && styles.tdPaid,
                    ]}>
                    {formatPaise(entry.remainingBalancePaise)}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Footer Close */}
          <View style={styles.footerDock}>
            <Pressable onPress={onClose} style={styles.closeActionBtn}>
              <Text style={styles.closeActionText}>CLOSE SCHEDULE</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0D111A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: '82%',
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: '#8E9BB0',
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#8E9BB0',
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#07090E',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  thText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  tableBody: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  tableRowPaid: {
    opacity: 0.65,
  },
  tdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tdPaid: {
    color: '#8E9BB0',
  },
  tdInterest: {
    color: '#FFB800',
  },
  tdBalance: {
    fontWeight: '700',
  },
  colNo: {
    width: 36,
  },
  colPrincipal: {
    flex: 1.2,
  },
  colInterest: {
    flex: 1.1,
  },
  colBalance: {
    flex: 1.4,
    textAlign: 'right',
  },
  footerDock: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeActionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
