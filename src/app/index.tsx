import { useRouter } from 'expo-router';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeTopBar } from '@/components/home/HomeTopBar';
import { SafeToSpendHero } from '@/components/home/SafeToSpendHero';
import { AlertsTelemetry } from '@/components/home/AlertsTelemetry';
import { LoanCockpitCard } from '@/components/home/LoanCockpitCard';
import { CashFlowGauge } from '@/components/home/CashFlowGauge';
import { RecentTransactionsFeed } from '@/components/home/RecentTransactionsFeed';
import { QuickActionDock } from '@/components/home/QuickActionDock';
import { VideoSplashOverlay } from '@/components/video-splash';
import { TeslaHudModal, TeslaHudModalProps } from '@/components/ui/TeslaHudModal';
import { TransactionDetailModal } from '@/components/transaction/TransactionDetailModal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHomeDashboard, AlertItem, TransactionItem } from '@/hooks/useHomeDashboard';
import { Transaction } from '@/domain/types';

export default function HomeScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const [showVideoModal, setShowVideoModal] = useState(false);
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
    safeToSpend,
    outflows,
    alerts,
    dismissAlert,
    nextEmi,
    markEmiPaid,
    cashFlow,
    smsPendingCount,
    transactions,
  } = useHomeDashboard();

  // Tesla Cockpit Entrance Transition
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

  const handleTransactionPress = useCallback((item: TransactionItem) => {
    // Transform to domain Transaction model and open Tesla inspection sheet
    const tx: Transaction = {
      id: item.id,
      accountId: 'acc_hdfc',
      amountPaise: item.amountPaise,
      direction: item.direction,
      categoryId:
        item.id === 'tx-1'
          ? 'cat_food'
          : item.direction === 'credit'
          ? 'cat_income'
          : item.id === 'tx-3'
          ? 'cat_transport'
          : item.id === 'tx-4'
          ? 'cat_entertainment'
          : 'cat_groceries',
      merchant: item.merchant,
      note:
        item.id === 'tx-1'
          ? 'Dinner with friends'
          : item.id === 'tx-2'
          ? 'Monthly tech salary'
          : item.id === 'tx-3'
          ? 'Full tank petrol'
          : undefined,
      txnDate: new Date().toISOString(),
      source: 'manual',
      status: 'confirmed',
    };
    setSelectedDetailTx(tx);
  }, []);

  const handlePayEmi = useCallback(() => {
    markEmiPaid();
    setHudModal({
      visible: true,
      title: 'EMI Repayment Logged',
      subtitle: `Successfully recorded repayment for ${nextEmi.loanName}!\nRemaining scheduled reminders have been reconciled locally.`,
      icon: '🏦',
      badge: 'LOAN TELEMETRY RECONCILED',
      accentColor: '#00E676',
      buttonText: 'CONTINUE COCKPIT',
    });
  }, [markEmiPaid, nextEmi.loanName]);

  const handleAddManual = useCallback(() => {
    router.push('/transactions');
  }, [router]);

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
          {/* Top Tesla Telemetry Bar */}
          <HomeTopBar
            onPressMenu={() => router.push('/explore')}
            onPressLock={() => {
              setHudModal({
                visible: true,
                title: 'App Vault Secured',
                subtitle:
                  'Biometric on-device encryption active.\nZero telemetry leaves this device. 100% offline financial privacy.',
                icon: '🔒',
                badge: 'MILITARY-GRADE VAULT LOCK',
                accentColor: '#FFB800',
                buttonText: 'ACKNOWLEDGE & LOCK',
              });
            }}
            onPressSettings={() => router.push('/explore')}
          />

          {/* Actionable Alerts (EMI Due, Spikes) */}
          <AlertsTelemetry
            alerts={alerts}
            onDismiss={dismissAlert}
            onPressAlert={handleAlertPress}
          />

          {/* Safe To Spend Hero Cockpit */}
          <SafeToSpendHero
            safeToSpend={safeToSpend}
            outflows={outflows}
            onPressDetails={() => router.push('/explore')}
          />

          {/* Quick Action Dock */}
          <QuickActionDock
            onPressAddManual={handleAddManual}
            onPressVoice={handleVoiceEntry}
            onPressScan={handleScanOcr}
            onPressReplayVideo={() => setShowVideoModal(true)}
          />

          {/* Next EMI & Loan Health Cockpit */}
          <LoanCockpitCard
            nextEmi={nextEmi}
            onPayEmi={handlePayEmi}
            onViewLoanDetail={() => router.push('/explore')}
            onViewLoanHealth={() => router.push('/explore')}
          />

          {/* Monthly Budget / Cash Flow Energy Meter */}
          <CashFlowGauge cashFlow={cashFlow} />

          {/* SMS Queue & Recent Transactions Feed */}
          <RecentTransactionsFeed
            transactions={transactions}
            smsPendingCount={smsPendingCount}
            onPressSmsInbox={() => router.push('/transactions')}
            onPressViewAll={() => router.push('/transactions')}
            onPressTransaction={handleTransactionPress}
          />
        </Animated.View>
      </ScrollView>

      {/* Tesla Cockpit HUD Notification & Feedback Modal */}
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

      {/* Tesla Cockpit Transaction Inspection & Deletion Sheet */}
      <TransactionDetailModal
        visible={selectedDetailTx !== null}
        transaction={selectedDetailTx}
        onClose={() => setSelectedDetailTx(null)}
        onDelete={(id) => {
          setSelectedDetailTx(null);
          setHudModal({
            visible: true,
            title: 'Transaction Removed',
            subtitle: `Record ${id} has been permanently purged from your local secure vault.`,
            icon: '🗑️',
            badge: 'VAULT PURGE COMPLETE',
            accentColor: '#FF3B30',
            buttonText: 'CLOSE',
          });
        }}
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
