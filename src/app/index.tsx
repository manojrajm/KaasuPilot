import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertsTelemetry } from '@/components/home/AlertsTelemetry';
import { HomeTopBar } from '@/components/home/HomeTopBar';
import { LoanCockpitCard } from '@/components/home/LoanCockpitCard';
import { QuickActionDock } from '@/components/home/QuickActionDock';
import { RecentTransactionsFeed } from '@/components/home/RecentTransactionsFeed';
import { SalaryBalanceHero } from '@/components/home/SalaryBalanceHero';
import { SalaryRolloverCard } from '@/components/home/SalaryRolloverCard';
import { SmsReviewModal } from '@/components/home/SmsReviewModal';
import { SpendingVelocityGauge } from '@/components/telemetry/SpendingVelocityGauge';
import { AddTransactionModal } from '@/components/transaction/AddTransactionModal';
import { TransactionDetailModal } from '@/components/transaction/TransactionDetailModal';
import { TeslaHudModal } from '@/components/ui/TeslaHudModal';
import { VideoSplashOverlay } from '@/components/video-splash';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Transaction } from '@/domain/types';
import { useAccounts } from '@/hooks/useAccounts';
import { AlertItem, TransactionItem, useHomeDashboard } from '@/hooks/useHomeDashboard';
import { formatShortDate } from '@/utils/date';

export default function HomeScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const heroWidth = Math.min(width - Spacing.four * 2, MaxContentWidth, 380);
  const { accounts, byId: accountsById } = useAccounts();

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [selectedDetailTx, setSelectedDetailTx] = useState<Transaction | null>(null);

  // Tesla HUD Modal state
  const [hudModal, setHudModal] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    icon?: string;
    badge?: string;
    accentColor?: string;
    buttonText?: string;
  }>({
    visible: false,
    title: '',
  });

  const closeHudModal = useCallback(() => {
    setHudModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const {
    loading,
    profile,
    salaryCard,
    cycle,
    availablePaise,
    salaryPaise,
    extraIncomePaise,
    spentPaise,
    carriedInPaise,
    usedPercent,
    isOverspent,
    daysToNextSalary,
    pendingRollover,
    savingsPaise,
    resolveRollover,
    nextEmi,
    alerts,
    dismissAlert,
    markEmiPaid,
    transactions,
    recentTransactions,
    addTransaction,
    deleteTransaction,
    smsPendingCount,
    pendingSmsTransactions,
    spendingVelocity,
    approveSms,
    dismissSms,
  } = useHomeDashboard();

  // Entrance Transition
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleAlertPress = useCallback((alert: AlertItem) => {
    const isWarning = alert.severity === 'warning';
    const isAlert = alert.severity === 'alert';
    setHudModal({
      visible: true,
      title: alert.title,
      subtitle: alert.subtitle || 'Anomaly detected in transaction pattern.',
      icon: isAlert ? '⚠️' : isWarning ? '🏦' : 'ℹ️',
      badge: isAlert ? 'ANOMALY ALERT // SPEND SPIKE' : 'SCHEDULED EMI TELEMETRY',
      accentColor: isAlert ? '#FF3B30' : isWarning ? '#FFB800' : '#00F0FF',
      buttonText: 'ACKNOWLEDGE TELEMETRY',
    });
  }, []);

  const handleTransactionPress = useCallback(
    (item: TransactionItem) => {
      const tx = recentTransactions.find((t) => t.id === item.id);
      if (tx) setSelectedDetailTx(tx);
    },
    [recentTransactions]
  );

  const handlePayEmi = useCallback(async () => {
    if (!nextEmi) return;
    const loanName = nextEmi.loanName;
    const result = await markEmiPaid();
    if (result.ok) {
      setHudModal({
        visible: true,
        title: 'EMI Repayment Logged',
        subtitle: `Recorded the ${loanName} instalment.\nSaved in ledger and balance reconciled.`,
        icon: '🏦',
        badge: 'LOAN TELEMETRY RECONCILED',
        accentColor: '#00E676',
        buttonText: 'CONTINUE COCKPIT',
      });
    } else {
      setHudModal({
        visible: true,
        title: 'EMI Payment Failed',
        subtitle: result.reason,
        icon: '⚠️',
        badge: 'LOAN UPDATE BLOCKED',
        accentColor: '#FF3B30',
        buttonText: 'CLOSE',
      });
    }
  }, [markEmiPaid, nextEmi]);

  const handleAddManual = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleVoiceEntry = useCallback(() => {
    setHudModal({
      visible: true,
      title: 'Voice NLU Activated',
      subtitle:
        'Listening in offline mode...\nTry speaking: "Swiggy two hundred fifty food" or "Salary credited forty thousand"',
      icon: '🎙️',
      badge: 'ON-DEVICE SPEECH PARSER',
      accentColor: '#00F0FF',
      buttonText: 'START RECORDING',
    });
  }, []);

  const handleScanOcr = useCallback(() => {
    setHudModal({
      visible: true,
      title: 'Receipt OCR Scanner',
      subtitle:
        'On-device camera ML Kit engine ready.\nExtracting merchant name, total amount, taxes and date from bill.',
      icon: '📸',
      badge: 'MACHINE VISION OCR ENGINE',
      accentColor: '#BF5AF2',
      buttonText: 'OPEN SCANNER',
    });
  }, []);

  return (
    <View style={styles.screenContainer}>
      {showVideoModal && (
        <VideoSplashOverlay onFinish={() => setShowVideoModal(false)} />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(safeAreaInsets.top, Spacing.three),
            paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.six + 36,
          },
        ]}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        bounces={true}>
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          {/* Top Navigation & Status Bar */}
          <HomeTopBar
            onPressMenu={() => router.push('/profile')}
            onPressAnalytics={() => router.push('/explore')}
            onPressLock={() => {
              setHudModal({
                visible: true,
                title: 'App Vault Secured',
                subtitle:
                  'Biometric on-device encryption active.\nZero telemetry leaves this device. 100% offline financial privacy.',
                icon: '🔒',
                badge: 'HARDWARE VAULT LOCK',
                accentColor: '#FFB800',
                buttonText: 'ACKNOWLEDGE & LOCK',
              });
            }}
            onPressSettings={() => router.push('/profile')}
          />

          {/* Rollover Prompt on Salary Day */}
          {pendingRollover ? (
            <SalaryRolloverCard
              previousBalancePaise={pendingRollover.previousBalancePaise}
              onCarryForward={() => resolveRollover('carry')}
              onMoveToSavings={() => resolveRollover('savings')}
            />
          ) : null}

          {/* Actionable Alerts (EMI Due, Overspend) */}
          <AlertsTelemetry
            alerts={alerts}
            onDismiss={dismissAlert}
            onPressAlert={handleAlertPress}
          />

          {/* Primary Available Balance Hero Card (D4, D5) */}
          <SalaryBalanceHero
            salaryCard={salaryCard}
            userName={profile.name}
            availablePaise={availablePaise}
            salaryPaise={salaryPaise}
            extraIncomePaise={extraIncomePaise}
            spentPaise={spentPaise}
            carriedInPaise={carriedInPaise}
            usedPercent={usedPercent}
            isOverspent={isOverspent}
            daysToNextSalary={daysToNextSalary}
            savingsPaise={savingsPaise}
            nextSalaryDateStr={cycle ? formatShortDate(cycle.end) : undefined}
            width={heroWidth}
          />

          {/* Spending Burn Rate & Runway Telemetry Gauge */}
          {spendingVelocity && salaryPaise > 0 ? (
            <SpendingVelocityGauge
              telemetry={spendingVelocity}
              onPressDetails={() => router.push('/explore')}
            />
          ) : null}

          {/* Quick Action Dock */}
          <QuickActionDock
            onPressAddManual={handleAddManual}
            onPressVoice={handleVoiceEntry}
            onPressScan={handleScanOcr}
            onPressSms={() => setShowSmsModal(true)}
            onPressReplayVideo={() => setShowVideoModal(true)}
          />

          {/* Next EMI Cockpit (Only if upcoming EMI exists) */}
          {nextEmi ? (
            <LoanCockpitCard
              nextEmi={nextEmi}
              onPayEmi={handlePayEmi}
              onViewLoanDetail={() => router.push('/loans')}
              onViewLoanHealth={() => router.push('/loans')}
            />
          ) : null}

          {/* SMS Queue & Recent Transactions Feed */}
          <RecentTransactionsFeed
            transactions={transactions}
            smsPendingCount={smsPendingCount}
            onPressSmsInbox={() => setShowSmsModal(true)}
            onPressViewAll={() => router.push('/transactions')}
            onPressTransaction={handleTransactionPress}
          />
        </Animated.View>
      </ScrollView>

      {/* Cockpit HUD Notification & Feedback Modal */}
      <TeslaHudModal
        visible={hudModal.visible}
        title={hudModal.title}
        subtitle={hudModal.subtitle}
        icon={hudModal.icon}
        badge={hudModal.badge}
        accentColor={hudModal.accentColor}
        buttonText={hudModal.buttonText}
        onClose={closeHudModal}
      />

      {/* Manual entry, saved straight to the on-device ledger */}
      <AddTransactionModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (data) => {
          try {
            await addTransaction({
              ...data,
              txnDate: new Date().toISOString(),
              source: 'manual',
              status: 'confirmed',
            });
          } catch (error) {
            console.error('Failed to save transaction', error);
          }
        }}
      />

      {/* Transaction Inspection & Deletion Sheet */}
      <TransactionDetailModal
        visible={selectedDetailTx !== null}
        transaction={selectedDetailTx}
        onClose={() => setSelectedDetailTx(null)}
        onDelete={async (id) => {
          setSelectedDetailTx(null);
          const deleted = await deleteTransaction(id);
          setHudModal({
            visible: true,
            title: deleted ? 'Transaction Removed' : 'Transaction Not Found',
            subtitle: deleted
              ? 'The record has been permanently deleted from this device.'
              : 'This record was already removed.',
            icon: '🗑️',
            badge: 'VAULT PURGE COMPLETE',
            accentColor: '#FF3B30',
            buttonText: 'CLOSE',
          });
        }}
      />

      {/* SMS Intelligence Review Modal */}
      <SmsReviewModal
        visible={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        pendingTransactions={pendingSmsTransactions}
        accounts={accounts}
        accountsById={accountsById}
        onApprove={approveSms}
        onDismiss={dismissSms}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#07090E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
});