import React, { useState, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Loan, PrepaymentStrategy } from '@/domain/types';
import { calculatePrepaymentImpact } from '@/domain/loans/prepayment';
import { formatPaise } from '@/domain/money/format';
import { toPaise } from '@/domain/money/paise';

interface PrepaymentSimulatorModalProps {
  visible: boolean;
  loan: Loan | null;
  onClose: () => void;
  onApplyPrepayment: (
    loanId: string,
    lumpSumPaise: number,
    strategy: PrepaymentStrategy
  ) => void;
}

const PRESET_AMOUNTS = [25000, 50000, 100000, 200000];

export function PrepaymentSimulatorModal({
  visible,
  loan,
  onClose,
  onApplyPrepayment,
}: PrepaymentSimulatorModalProps) {
  const [lumpSumInput, setLumpSumInput] = useState('50000');
  const [strategy, setStrategy] = useState<PrepaymentStrategy>('reduce_tenure');

  const lumpSumPaise = useMemo(() => {
    return toPaise(lumpSumInput);
  }, [lumpSumInput]);

  const impact = useMemo(() => {
    if (!loan || lumpSumPaise <= 0) return null;
    return calculatePrepaymentImpact(loan, lumpSumPaise, strategy);
  }, [loan, lumpSumPaise, strategy]);

  if (!visible || !loan) return null;

  const handleApply = () => {
    if (lumpSumPaise <= 0) return;
    onApplyPrepayment(loan.id, lumpSumPaise, strategy);
    onClose();
  };

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
              <Text style={styles.headerTitle}>PREPAYMENT SIMULATOR</Text>
              <Text style={styles.headerSubtitle}>
                {loan.name} • {loan.lender}
              </Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}>
            {/* Lump Sum Amount Input */}
            <View style={styles.inputCard}>
              <Text style={styles.sectionLabel}>LUMP SUM EXTRA PAYMENT</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  value={lumpSumInput}
                  onChangeText={setLumpSumInput}
                  keyboardType="numeric"
                  placeholder="50,000"
                  placeholderTextColor="#65738E"
                  style={styles.amountInput}
                />
              </View>

              {/* Quick Preset Chips */}
              <View style={styles.presetsRow}>
                {PRESET_AMOUNTS.map((amt) => {
                  const isSelected = lumpSumInput === String(amt);
                  return (
                    <Pressable
                      key={amt}
                      onPress={() => setLumpSumInput(String(amt))}
                      style={[
                        styles.presetChip,
                        isSelected && styles.presetChipSelected,
                      ]}>
                      <Text
                        style={[
                          styles.presetChipText,
                          isSelected && styles.presetChipTextSelected,
                        ]}>
                        +₹{amt >= 100000 ? `${amt / 100000}L` : `${amt / 1000}k`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Strategy Toggle */}
            <View style={styles.strategyContainer}>
              <Text style={styles.sectionLabel}>OPTIMIZATION STRATEGY</Text>
              <View style={styles.strategyRow}>
                <Pressable
                  onPress={() => setStrategy('reduce_tenure')}
                  style={[
                    styles.strategyCard,
                    strategy === 'reduce_tenure' && styles.strategyCardActive,
                  ]}>
                  <Text style={styles.strategyEmoji}>⚡</Text>
                  <Text style={styles.strategyTitle}>Reduce Tenure</Text>
                  <Text style={styles.strategyDesc}>
                    Keep EMI same, finish loan months earlier. Maximizes interest saved!
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setStrategy('reduce_emi')}
                  style={[
                    styles.strategyCard,
                    strategy === 'reduce_emi' && styles.strategyCardActive,
                  ]}>
                  <Text style={styles.strategyEmoji}>💸</Text>
                  <Text style={styles.strategyTitle}>Reduce EMI</Text>
                  <Text style={styles.strategyDesc}>
                    Keep tenure same, lower monthly outflow. Boosts monthly liquidity.
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Telemetry Impact Card */}
            {impact ? (
              <View style={styles.telemetryCard}>
                <View style={styles.telemetryHeader}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.telemetryHeaderText}>
                    REAL-TIME SIMULATION TELEMETRY
                  </Text>
                </View>

                {/* Hero Interest Saved */}
                <View style={styles.heroImpactBox}>
                  <Text style={styles.heroImpactLabel}>TOTAL INTEREST SAVED</Text>
                  <Text style={styles.heroImpactValue}>
                    🎉 {formatPaise(impact.totalInterestSavedPaise)}
                  </Text>
                  <Text style={styles.heroImpactNote}>
                    Directly subtracted from bank interest charges
                  </Text>
                </View>

                {/* Metrics Comparison Grid */}
                <View style={styles.impactGrid}>
                  {strategy === 'reduce_tenure' ? (
                    <>
                      <View style={styles.impactCell}>
                        <Text style={styles.impactCellLabel}>TIME SAVED</Text>
                        <Text style={styles.impactCellValue}>
                          {impact.monthsSaved} Months Earlier ⏱️
                        </Text>
                      </View>
                      <View style={styles.impactCell}>
                        <Text style={styles.impactCellLabel}>NEW COMPLETION</Text>
                        <Text style={styles.impactCellValueHighlight}>
                          {impact.newEndDate}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.impactCell}>
                        <Text style={styles.impactCellLabel}>OLD EMI</Text>
                        <Text style={styles.impactCellValue}>
                          {formatPaise(loan.emiPaise)} / mo
                        </Text>
                      </View>
                      <View style={styles.impactCell}>
                        <Text style={styles.impactCellLabel}>NEW REDUCED EMI</Text>
                        <Text style={styles.impactCellValueHighlight}>
                          {formatPaise(impact.newEmiPaise)} / mo 📉
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Docked Action Button */}
          <View style={styles.footerDock}>
            <Pressable
              onPress={handleApply}
              style={({ pressed }) => [
                styles.applyBtn,
                pressed && styles.btnPressed,
              ]}>
              <Text style={styles.applyBtnText}>
                ⚡ RECORD PREPAYMENT IN LOCAL VAULT
              </Text>
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
    borderColor: 'rgba(255, 184, 0, 0.25)',
    maxHeight: '90%',
    paddingBottom: 24,
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
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  inputCard: {
    backgroundColor: '#07090E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 10,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFB800',
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    paddingVertical: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChipSelected: {
    backgroundColor: 'rgba(255, 184, 0, 0.18)',
    borderColor: '#FFB800',
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  presetChipTextSelected: {
    color: '#FFB800',
  },
  strategyContainer: {
    gap: 10,
  },
  strategyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  strategyCard: {
    flex: 1,
    backgroundColor: '#07090E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 4,
  },
  strategyCardActive: {
    borderColor: '#FFB800',
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
  },
  strategyEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  strategyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  strategyDesc: {
    fontSize: 10.5,
    color: '#8E9BB0',
    lineHeight: 14,
  },
  telemetryCard: {
    backgroundColor: '#07090E',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    gap: 12,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  telemetryHeaderText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 0.8,
  },
  heroImpactBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
    gap: 3,
  },
  heroImpactLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  heroImpactValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#00E676',
  },
  heroImpactNote: {
    fontSize: 10.5,
    color: '#8E9BB0',
  },
  impactGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  impactCell: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  impactCellLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  impactCellValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  impactCellValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00F0FF',
  },
  footerDock: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  applyBtn: {
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#07090E',
    letterSpacing: 0.5,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
