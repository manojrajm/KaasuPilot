import { useRouter } from 'expo-router';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Alert,
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
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHomeDashboard, AlertItem, TransactionItem } from '@/hooks/useHomeDashboard';

export default function HomeScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const [showVideoModal, setShowVideoModal] = useState(false);

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
    if (Platform.OS === 'web') {
      window.alert(`${alert.title}\n${alert.subtitle || ''}`);
    } else {
      Alert.alert(alert.title, alert.subtitle || '');
    }
  }, []);

  const handleTransactionPress = useCallback((_tx: TransactionItem) => {
    router.push('/transactions');
  }, [router]);

  const handlePayEmi = useCallback(() => {
    markEmiPaid();
    const msg = `Successfully recorded repayment for ${nextEmi.loanName}!\nRemaining scheduled reminders have been reconciled.`;
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('EMI Repayment Logged', msg);
    }
  }, [markEmiPaid, nextEmi.loanName]);

  const handleAddManual = useCallback(() => {
    router.push('/transactions');
  }, [router]);

  const handleVoiceEntry = useCallback(() => {
    const msg = 'Voice NLU listening activated.\nTry speaking: "Swiggy two hundred fifty food"';
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Voice Entry (Offline)', msg);
    }
  }, []);

  const handleScanOcr = useCallback(() => {
    const msg = 'Receipt OCR scanner ready.\nOn-device ML Kit will extract merchant, total & date.';
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('Receipt Scan (OCR)', msg);
    }
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
              if (Platform.OS === 'web') window.alert('Vault Locked');
              else Alert.alert('Security', 'App Vault Locked');
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
