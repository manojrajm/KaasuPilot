import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { formatPaise } from '@/domain/money/format';
import { excelReportService, MonthlyReportMetadata } from '@/services/excelReportService';

interface MonthlyReportAuditCardProps {
  onOpenInstantBackup: () => void;
  onOpenRestoreBackup?: () => void;
}

export function MonthlyReportAuditCard({
  onOpenInstantBackup,
  onOpenRestoreBackup,
}: MonthlyReportAuditCardProps) {
  const [months, setMonths] = useState<{ year: number; month: number; label: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previewMeta, setPreviewMeta] = useState<MonthlyReportMetadata | null>(null);

  const loadMonthPreview = useCallback(async (year: number, month: number) => {
    setLoading(true);
    try {
      const { meta } = await excelReportService.buildMonthlyCsvString(year, month);
      setPreviewMeta(meta);
    } catch (e) {
      console.warn('Failed to load month report preview', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load available months
  useEffect(() => {
    let active = true;
    excelReportService.getAvailableReportMonths().then((mList) => {
      if (!active) return;
      setMonths(mList);
      if (mList.length > 0) {
        loadMonthPreview(mList[0].year, mList[0].month);
      }
    });
    return () => {
      active = false;
    };
  }, [loadMonthPreview]);

  const handlePrevMonth = () => {
    if (selectedIndex < months.length - 1) {
      const newIdx = selectedIndex + 1;
      setSelectedIndex(newIdx);
      loadMonthPreview(months[newIdx].year, months[newIdx].month);
    }
  };

  const handleNextMonth = () => {
    if (selectedIndex > 0) {
      const newIdx = selectedIndex - 1;
      setSelectedIndex(newIdx);
      loadMonthPreview(months[newIdx].year, months[newIdx].month);
    }
  };

  const handleDownload = async () => {
    if (!previewMeta) return;
    setLoading(true);
    try {
      const res = await excelReportService.downloadReportToUserStorage(
        previewMeta.year,
        previewMeta.month
      );

      if (res.success) {
        Alert.alert(
          '✅ Saved to Downloads Folder',
          `Your Excel report has been saved directly to your phone's ${res.folderName} folder:\n\n📄 ${res.filename}\n\nYou can open it directly in Microsoft Excel, Google Sheets, or view it in your phone's Downloads app.`,
          [
            { text: 'Done' },
            {
              text: 'Open / Share Now',
              onPress: () =>
                excelReportService.shareMonthlyReport(previewMeta.year, previewMeta.month),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Download Failed', err.message || 'Could not save report to Downloads.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!previewMeta) return;
    setLoading(true);
    try {
      await excelReportService.shareMonthlyReport(previewMeta.year, previewMeta.month);
    } catch (err: any) {
      Alert.alert('Share Failed', err.message || 'Could not share report.');
    } finally {
      setLoading(false);
    }
  };

  const currentSelection = months[selectedIndex];

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerIcon}>📊</Text>
          <Text style={styles.title}>MONTHLY EXCEL REPORTS & AUDIT</Text>
        </View>
        <View style={styles.badgePill}>
          <Text style={styles.badgeText}>EXCEL (.XLSX) • MULTI-SHEET</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Export a high-fidelity Microsoft Excel (.xlsx) workbook featuring executive KPI metric cards,
        category statistics, and a detailed ledger with everyday subtotal rows.
      </Text>

      {/* Month Selector Stepper */}
      <View style={styles.selectorContainer}>
        <Pressable
          onPress={handlePrevMonth}
          disabled={selectedIndex >= months.length - 1}
          style={({ pressed }) => [
            styles.stepperBtn,
            selectedIndex >= months.length - 1 && styles.stepperDisabled,
            pressed && styles.stepperPressed,
          ]}>
          <Text style={styles.stepperArrow}>◀</Text>
        </Pressable>

        <View style={styles.monthDisplay}>
          <Text style={styles.monthLabel}>
            {currentSelection ? currentSelection.label : 'Loading...'}
          </Text>
          <Text style={styles.monthStatus}>
            {selectedIndex === 0 ? 'CURRENT ACTIVE CYCLE' : 'ARCHIVED CYCLE'}
          </Text>
        </View>

        <Pressable
          onPress={handleNextMonth}
          disabled={selectedIndex <= 0}
          style={({ pressed }) => [
            styles.stepperBtn,
            selectedIndex <= 0 && styles.stepperDisabled,
            pressed && styles.stepperPressed,
          ]}>
          <Text style={styles.stepperArrow}>▶</Text>
        </Pressable>
      </View>

      {/* Telemetry Snapshot for Selected Month */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#00F0FF" />
          <Text style={styles.loadingText}>Compiling monthly audit data...</Text>
        </View>
      ) : previewMeta ? (
        <View style={styles.telemetryBox}>
          <View style={styles.telemetryRow}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>TOTAL SPENT</Text>
              <Text style={[styles.telemetryValue, styles.spentColor]}>
                {formatPaise(previewMeta.totalSpentPaise)}
              </Text>
            </View>
            <View style={styles.telemetryDivider} />
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>TOTAL INCOME</Text>
              <Text style={[styles.telemetryValue, styles.incomeColor]}>
                {formatPaise(previewMeta.totalIncomePaise)}
              </Text>
            </View>
            <View style={styles.telemetryDivider} />
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>TRANSACTIONS</Text>
              <Text style={styles.telemetryValue}>{previewMeta.transactionsCount}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              📅 {previewMeta.daysWithExpensesCount} days with recorded expenses
            </Text>
            <Text style={styles.metaText}>
              {previewMeta.netSavingsPaise >= 0 ? '🟢 Net Saved: ' : '🔴 Deficit: '}
              {formatPaise(previewMeta.netSavingsPaise)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* 1. Download Excel Report */}
        <Pressable
          onPress={handleDownload}
          disabled={loading || !previewMeta}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}>
          <Text style={styles.primaryBtnIcon}>📥</Text>
          <View style={styles.btnTextWrap}>
            <Text style={styles.primaryBtnTitle}>DOWNLOAD PRO EXCEL WORKBOOK (.XLSX)</Text>
            <Text style={styles.primaryBtnSubtitle}>
              Executive KPI stats, category breakdown & everyday subtotals
            </Text>
          </View>
          <Text style={styles.chevron}>↗</Text>
        </Pressable>

        {/* 2. Share via WhatsApp / Drive / Email */}
        <Pressable
          onPress={handleShare}
          disabled={loading || !previewMeta}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}>
          <Text style={styles.secondaryBtnIcon}>📤</Text>
          <Text style={styles.secondaryBtnText}>Share to WhatsApp / Drive / CA</Text>
          <Text style={styles.chevronSecondary}>↗</Text>
        </Pressable>

        {/* 3. On-Demand Instant Encrypted Backup (User Requested) */}
        <Pressable
          onPress={onOpenInstantBackup}
          style={({ pressed }) => [styles.vaultBackupBtn, pressed && styles.btnPressed]}>
          <Text style={styles.vaultIcon}>🛡️</Text>
          <View style={styles.btnTextWrap}>
            <Text style={styles.vaultTitle}>CREATE INSTANT ENCRYPTED BACKUP (.KASUVAULT)</Text>
            <Text style={styles.vaultSubtitle}>
              Air-gapped on-demand cold backup secured with Master PIN
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {/* 4. Restore from Encrypted Backup */}
        {onOpenRestoreBackup ? (
          <Pressable
            onPress={onOpenRestoreBackup}
            style={({ pressed }) => [styles.vaultRestoreBtn, pressed && styles.btnPressed]}>
            <Text style={styles.vaultIcon}>📥</Text>
            <View style={styles.btnTextWrap}>
              <Text style={styles.vaultRestoreTitle}>RESTORE FROM BACKUP (.KASUVAULT)</Text>
              <Text style={styles.vaultSubtitle}>
                Import & recover encrypted ledger on this or new device
              </Text>
            </View>
            <Text style={[styles.chevron, { color: '#00E676' }]}>›</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: Spacing.four,
    marginBottom: Spacing.four,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 1.2,
  },
  badgePill: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#8A96AD',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  selectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121724',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 6,
    marginBottom: Spacing.three,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#182030',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepperPressed: {
    opacity: 0.7,
  },
  stepperDisabled: {
    opacity: 0.25,
  },
  stepperArrow: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthDisplay: {
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  monthStatus: {
    fontSize: 9,
    fontWeight: '700',
    color: '#00E676',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  loadingText: {
    fontSize: 12,
    color: '#65738E',
  },
  telemetryBox: {
    backgroundColor: '#121724',
    borderRadius: 12,
    padding: 12,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 8,
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  telemetryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  spentColor: {
    color: '#FF5252',
  },
  incomeColor: {
    color: '#00E676',
  },
  telemetryDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  metaText: {
    fontSize: 11,
    color: '#8A96AD',
  },
  actionsContainer: {
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: '#00F0FF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  primaryBtnIcon: {
    fontSize: 20,
  },
  btnTextWrap: {
    flex: 1,
  },
  primaryBtnTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.3,
  },
  primaryBtnSubtitle: {
    fontSize: 10.5,
    color: '#8A96AD',
    marginTop: 1,
  },
  chevron: {
    fontSize: 18,
    color: '#00F0FF',
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151C2C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  secondaryBtnIcon: {
    fontSize: 16,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chevronSecondary: {
    fontSize: 16,
    color: '#65738E',
  },
  vaultBackupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111722',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginTop: 2,
  },
  vaultIcon: {
    fontSize: 20,
  },
  vaultTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 0.2,
  },
  vaultSubtitle: {
    fontSize: 10.5,
    color: '#8A96AD',
    marginTop: 1,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  vaultRestoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F181B',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    marginTop: 2,
  },
  vaultRestoreTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 0.2,
  },
});
