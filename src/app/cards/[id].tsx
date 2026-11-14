import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BankCard } from '@/components/cards/BankCard';
import { cardPropsFromAccount } from '@/components/cards/cardProps';
import { PrimaryButton } from '@/components/forms/FormFields';
import { useAppLock } from '@/components/security/LockProvider';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { accountRepo } from '@/data/repositories/accountRepo';
import { cardRepo } from '@/data/repositories/cardRepo';
import { transactionRepo } from '@/data/repositories/transactionRepo';
import { formatCardNumber } from '@/domain/cards/cardNumber';
import { formatPaise } from '@/domain/money/format';
import { Account, Transaction } from '@/domain/types';
import { useSecureScreen } from '@/hooks/useSecureScreen';
import { CardSecrets } from '@/services/cardVault';
import { formatRelativeDateTime } from '@/utils/date';

export default function CardDetailScreen() {
  useSecureScreen('card-detail');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { confirmIdentity } = useAppLock();
  const { id } = useLocalSearchParams<{ id: string }>();

  const cardWidth = Math.min(width - Spacing.four * 2, MaxContentWidth, 380);

  const [card, setCard] = useState<Account | null | undefined>(undefined);
  const [secrets, setSecrets] = useState<CardSecrets | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deleting, setDeleting] = useState(false);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to card & transactions
  useEffect(() => {
    if (!id) return;
    let active = true;

    const loadData = async () => {
      try {
        const found = await cardRepo.getById(id);
        const txns = await transactionRepo.getAll({ accountId: id });
        if (active) {
          setCard(found ?? null);
          setTransactions(txns);
        }
      } catch (err) {
        console.error('Failed to load card detail', err);
        if (active) setCard(null);
      }
    };

    loadData();
    const unsubCard = accountRepo.subscribe(loadData);
    const unsubTxn = transactionRepo.subscribe(loadData);

    return () => {
      active = false;
      unsubCard();
      unsubTxn();
    };
  }, [id]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // Countdown handler for secret auto-hide
  const startHideCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setCountdown(30);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setSecrets(null);
          setFlipped(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRevealSecrets = async () => {
    if (secrets) {
      // User tapped to manually hide
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setSecrets(null);
      setCountdown(0);
      setFlipped(false);
      return;
    }

    const ok = await confirmIdentity('Unlock hardware vault to view card credentials');
    if (!ok) return;

    try {
      const s = await cardRepo.readSecrets(id);
      if (s) {
        setSecrets(s);
        startHideCountdown();
      } else {
        Alert.alert('Not Found', 'No credentials stored for this card.');
      }
    } catch (err) {
      console.error('Failed to read secrets', err);
      Alert.alert('Hardware Keystore Error', 'Could not retrieve encrypted secrets.');
    }
  };

  const handleCopyNumber = async () => {
    let numberToCopy = secrets?.number;

    if (!numberToCopy) {
      const ok = await confirmIdentity('Authenticate to copy card number');
      if (!ok) return;
      const s = await cardRepo.readSecrets(id);
      if (!s) {
        Alert.alert('Error', 'Card secrets could not be loaded.');
        return;
      }
      numberToCopy = s.number;
    }

    await Clipboard.setStringAsync(numberToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);

    Alert.alert(
      'Card Number Copied',
      'The card number has been copied to your clipboard. For your security, it will be automatically cleared in 30 seconds.'
    );

    // Auto-clear clipboard after 30 seconds
    const copiedTarget = numberToCopy;
    setTimeout(async () => {
      try {
        const current = await Clipboard.getStringAsync();
        if (current === copiedTarget) {
          await Clipboard.setStringAsync('');
        }
      } catch {
        // ignore
      }
    }, 30000);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this card? Encrypted credentials will be permanently erased from the hardware vault.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await cardRepo.remove(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete card.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (card === undefined) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  if (card === null) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.errorTitle}>Card Not Found</Text>
        <Text style={styles.errorSub}>This card might have been deleted or archived.</Text>
        <PrimaryButton label="Back to Cards" tone="accent" onPress={() => router.back()} />
      </View>
    );
  }

  const isCredit = card.cardKind === 'credit';
  const outstandingPaise = isCredit ? Math.max(0, -card.currentBalancePaise) : 0;
  const balancePaise = isCredit ? card.currentBalancePaise : card.currentBalancePaise;
  const creditLimitPaise = card.creditLimitPaise ?? 0;
  const availableCreditPaise = Math.max(0, creditLimitPaise - outstandingPaise);

  const baseProps = cardPropsFromAccount(card);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, Spacing.three),
            paddingBottom: insets.bottom + BottomTabInset + Spacing.six + 48,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Navigation Header */}
        <View style={[styles.header, { width: cardWidth }]}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backBtn}>‹ Cards</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{card.name.toUpperCase()}</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/cards/new', params: { id } })}
            hitSlop={10}>
            <Text style={styles.editBtn}>Edit</Text>
          </Pressable>
        </View>

        {/* Card Interactive Preview */}
        <View style={styles.cardInteractiveWrap}>
          <BankCard
            {...baseProps}
            fullNumber={secrets?.number}
            expiry={secrets?.expiry}
            cvv={secrets?.cvv}
            flipped={flipped}
            width={cardWidth}
            onPress={() => setFlipped((prev) => !prev)}
          />
          <Text style={styles.flipHint}>
            {flipped ? 'Tap card to view front' : 'Tap card to flip and view magnetic stripe & CVV'}
          </Text>
        </View>

        {/* Security Controls & Reveal HUD */}
        <View style={[styles.vaultCard, { width: cardWidth }]}>
          <View style={styles.vaultHeaderRow}>
            <View style={styles.vaultTitleCol}>
              <Text style={styles.vaultSectionLabel}>HARDWARE VAULT SECRETS</Text>
              <Text style={styles.vaultStatusText}>
                {secrets ? `🔓 Unlocked (${countdown}s remaining)` : '🔒 Zero-Knowledge Encrypted'}
              </Text>
            </View>
            <Pressable
              onPress={handleRevealSecrets}
              style={[styles.revealPill, secrets ? styles.revealPillActive : undefined]}>
              <Text style={[styles.revealPillText, secrets ? styles.revealPillTextActive : undefined]}>
                {secrets ? 'Hide Secrets' : '👁 Reveal'}
              </Text>
            </Pressable>
          </View>

          {secrets ? (
            <View style={styles.secretsGrid}>
              <View style={styles.secretBox}>
                <Text style={styles.secretBoxLabel}>FULL NUMBER</Text>
                <Text style={styles.secretBoxValue}>{formatCardNumber(secrets.number, card.network)}</Text>
              </View>
              <View style={styles.secretRow}>
                <View style={[styles.secretBox, { flex: 1 }]}>
                  <Text style={styles.secretBoxLabel}>EXPIRY</Text>
                  <Text style={styles.secretBoxValue}>{secrets.expiry}</Text>
                </View>
                <View style={[styles.secretBox, { flex: 1 }]}>
                  <Text style={styles.secretBoxLabel}>CVV / CVC</Text>
                  <Text style={styles.secretBoxValue}>{secrets.cvv}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Copy Card Number CTA */}
          <Pressable
            onPress={handleCopyNumber}
            style={({ pressed }) => [
              styles.copyBtn,
              copied && styles.copyBtnSuccess,
              pressed && { opacity: 0.8 },
            ]}>
            <Text style={[styles.copyBtnText, copied && styles.copyBtnTextSuccess]}>
              {copied ? '✓ COPIED TO CLIPBOARD (AUTO-CLEAR 30S)' : '📋 COPY FULL CARD NUMBER'}
            </Text>
          </Pressable>
        </View>

        {/* Telemetry Metrics Panel */}
        <View style={[styles.telemetryCard, { width: cardWidth }]}>
          <Text style={styles.telemetryTitle}>FINANCIAL TELEMETRY</Text>

          {isCredit ? (
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>CURRENT OUTSTANDING</Text>
                <Text style={[styles.telemetryValue, outstandingPaise > 0 && styles.debtText]}>
                  {formatPaise(outstandingPaise)}
                </Text>
              </View>
              <View style={styles.telemetryCol}>
                <Text style={styles.telemetryLabel}>AVAILABLE LIMIT</Text>
                <Text style={[styles.telemetryValue, styles.availableText]}>
                  {formatPaise(availableCreditPaise)}
                </Text>
              </View>
              <View style={[styles.telemetryRowFull, { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }]}>
                <Text style={styles.telemetrySubLabel}>Total Sanctioned Limit</Text>
                <Text style={styles.telemetrySubValue}>{formatPaise(creditLimitPaise)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.telemetrySingle}>
              <Text style={styles.telemetryLabel}>LEDGER BALANCE</Text>
              <Text style={[styles.telemetryValueHero, balancePaise < 0 && styles.debtText]}>
                {formatPaise(balancePaise)}
              </Text>
            </View>
          )}
        </View>

        {/* Activity & Recent Transactions */}
        <View style={[styles.activitySection, { width: cardWidth }]}>
          <Text style={styles.activityTitle}>CARD TRANSACTIONS ({transactions.length})</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Text style={styles.emptyTxnText}>No transactions recorded on this card yet.</Text>
            </View>
          ) : (
            transactions.slice(0, 10).map((t) => {
              const isIncome = t.direction === 'credit';
              return (
                <View key={t.id} style={styles.txnRow}>
                  <View style={styles.txnLeft}>
                    <Text style={styles.txnMerchant}>{t.merchant}</Text>
                    <Text style={styles.txnDate}>{formatRelativeDateTime(t.txnDate)}</Text>
                  </View>
                  <Text style={[styles.txnAmount, isIncome ? styles.txnAmountIncome : styles.txnAmountExpense]}>
                    {isIncome ? '+' : '-'}{formatPaise(t.amountPaise)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Dangerous Operations */}
        <View style={[{ width: cardWidth, marginTop: Spacing.two }]}>
          <PrimaryButton
            label="DELETE CARD"
            tone="danger"
            loading={deleting}
            onPress={handleDelete}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07090E' },
  center: { justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: 16 },
  errorTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  errorSub: { color: '#8A96AD', fontSize: 14, textAlign: 'center' },
  content: { alignItems: 'center', gap: Spacing.four, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { color: '#00F0FF', fontSize: 15, fontWeight: '700' },
  headerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  editBtn: { color: '#FFD700', fontSize: 15, fontWeight: '700' },
  cardInteractiveWrap: { alignItems: 'center', gap: 8 },
  flipHint: { color: '#65738E', fontSize: 11, fontWeight: '600' },
  vaultCard: {
    backgroundColor: '#0D111A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.18)',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  vaultHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vaultTitleCol: { gap: 2 },
  vaultSectionLabel: { color: '#00F0FF', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  vaultStatusText: { color: '#8A96AD', fontSize: 12, fontWeight: '600' },
  revealPill: {
    backgroundColor: 'rgba(0,240,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  revealPillActive: {
    backgroundColor: 'rgba(255,107,97,0.12)',
    borderColor: 'rgba(255,107,97,0.4)',
  },
  revealPillText: { color: '#00F0FF', fontSize: 12, fontWeight: '800' },
  revealPillTextActive: { color: '#FF6B61' },
  secretsGrid: { gap: 10, paddingTop: 4 },
  secretRow: { flexDirection: 'row', gap: 10 },
  secretBox: {
    backgroundColor: '#07090E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    gap: 4,
  },
  secretBoxLabel: { color: '#65738E', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  secretBoxValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  copyBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBtnSuccess: {
    backgroundColor: 'rgba(0,230,118,0.12)',
    borderColor: 'rgba(0,230,118,0.3)',
  },
  copyBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  copyBtnTextSuccess: { color: '#00E676' },
  telemetryCard: {
    backgroundColor: '#0D111A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  telemetryTitle: { color: '#8A96AD', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  telemetryGrid: { gap: Spacing.three },
  telemetryCol: { gap: 4 },
  telemetryLabel: { color: '#65738E', fontSize: 11, fontWeight: '700' },
  telemetryValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  telemetrySingle: { gap: 4 },
  telemetryValueHero: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  debtText: { color: '#FF6B61' },
  availableText: { color: '#00E676' },
  telemetryRowFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  telemetrySubLabel: { color: '#8A96AD', fontSize: 12 },
  telemetrySubValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  activitySection: {
    backgroundColor: '#0D111A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  activityTitle: { color: '#8A96AD', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  emptyTransactions: { paddingVertical: 16, alignItems: 'center' },
  emptyTxnText: { color: '#5A667D', fontSize: 13 },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  txnLeft: { gap: 2 },
  txnMerchant: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  txnDate: { color: '#65738E', fontSize: 11 },
  txnAmount: { fontSize: 15, fontWeight: '800' },
  txnAmountIncome: { color: '#00E676' },
  txnAmountExpense: { color: '#FFFFFF' },
});