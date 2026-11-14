import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BankCard } from '@/components/cards/BankCard';
import { ChipGroup, ChipOption, Field, PrimaryButton } from '@/components/forms/FormFields';
import { useAppLock } from '@/components/security/LockProvider';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { cardRepo } from '@/data/repositories/cardRepo';
import { BANKS, BANK_ORDER } from '@/domain/cards/bankThemes';
import {
  detectNetwork,
  digitsOnly,
  expectedLength,
  formatCardNumber,
  formatExpiryInput,
  isValidLuhn,
  validateExpiry,
} from '@/domain/cards/cardNumber';
import { paiseFromRupees, rupeesFromPaise } from '@/domain/money/paise';
import { BankCode, CardKind, CardNetwork } from '@/domain/types';
import { useSecureScreen } from '@/hooks/useSecureScreen';

const NETWORK_OPTIONS: ChipOption<CardNetwork>[] = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'rupay', label: 'RuPay' },
  { value: 'amex', label: 'Amex' },
  { value: 'diners', label: 'Diners' },
];

export default function NewCardScreen() {
  useSecureScreen('card-form');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { confirmIdentity } = useAppLock();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const cardWidth = Math.min(width - Spacing.four * 2, MaxContentWidth, 380);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [bankCode, setBankCode] = useState<BankCode>('sbi');
  const [customBankName, setCustomBankName] = useState('');
  const [kind, setKind] = useState<CardKind>('debit');
  const [rawNumber, setRawNumber] = useState('');
  const [manualNetwork, setManualNetwork] = useState<CardNetwork | null>(null);
  const [holderName, setHolderName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [creditLimitRupees, setCreditLimitRupees] = useState('');

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect network if not manually set
  const detectedNet = useMemo(() => detectNetwork(rawNumber), [rawNumber]);
  const activeNetwork: CardNetwork = manualNetwork ?? (detectedNet === 'unknown' ? 'visa' : detectedNet);

  // Load existing card in edit mode
  useEffect(() => {
    if (!id) return;
    let active = true;

    async function loadCard() {
      const ok = await confirmIdentity('Unlock hardware vault to edit card details');
      if (!ok) {
        if (active) router.back();
        return;
      }

      try {
        const card = await cardRepo.getById(id!);
        if (!card) {
          Alert.alert('Card Not Found', 'This card does not exist.');
          if (active) router.back();
          return;
        }

        const secrets = await cardRepo.readSecrets(id!);
        const startingPaise = await cardRepo.getStartingAmount(id!);

        if (!active) return;
        setBankCode(card.bankCode ?? 'sbi');
        if (card.bankCode === 'other' && card.institution) {
          setCustomBankName(card.institution);
        }
        setKind(card.cardKind ?? 'debit');
        setManualNetwork(card.network ?? 'visa');
        setHolderName(card.holderName ?? '');

        if (secrets) {
          setRawNumber(secrets.number);
          setExpiry(secrets.expiry);
          setCvv(secrets.cvv);
        }

        setAmountRupees(rupeesFromPaise(startingPaise).toString());
        if (card.creditLimitPaise) {
          setCreditLimitRupees(rupeesFromPaise(card.creditLimitPaise).toString());
        }
      } catch (err) {
        console.error('Failed to load card for editing', err);
        Alert.alert('Error', 'Could not load card details.');
        if (active) router.back();
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCard();
    return () => {
      active = false;
    };
  }, [id, confirmIdentity, router]);

  // Handle Card Number Input
  const handleNumberChange = (text: string) => {
    const digits = digitsOnly(text);
    const maxLen = expectedLength(activeNetwork);
    const truncated = digits.slice(0, maxLen);
    setRawNumber(truncated);

    // If user clears manual network or hasn't set one, allow auto-detection
    if (!manualNetwork) {
      const newNet = detectNetwork(truncated);
      if (newNet !== 'unknown') {
        // Automatically sync
      }
    }

    if (errors.number) {
      setErrors((prev) => ({ ...prev, number: '' }));
    }
  };

  // Handle Expiry Input
  const handleExpiryChange = (text: string) => {
    const formatted = formatExpiryInput(text);
    setExpiry(formatted);
    if (errors.expiry) {
      setErrors((prev) => ({ ...prev, expiry: '' }));
    }
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (bankCode === 'other' && !customBankName.trim()) {
      newErrors.customBankName = 'Please enter bank name';
    }

    const digits = digitsOnly(rawNumber);
    const maxLen = expectedLength(activeNetwork);
    if (digits.length === 0) {
      newErrors.number = 'Card number is required';
    } else if (digits.length < maxLen) {
      newErrors.number = `Card number must be ${maxLen} digits for ${activeNetwork.toUpperCase()}`;
    } else if (!isValidLuhn(digits)) {
      newErrors.number = 'Invalid card number (checksum failed)';
    }

    if (!holderName.trim()) {
      newErrors.holderName = 'Cardholder name is required';
    }

    const expiryErr = validateExpiry(expiry);
    if (expiryErr) {
      newErrors.expiry = expiryErr;
    }

    const cvvDigits = digitsOnly(cvv);
    const expectedCvvLen = activeNetwork === 'amex' ? 4 : 3;
    if (cvvDigits.length !== expectedCvvLen) {
      newErrors.cvv = `CVV must be ${expectedCvvLen} digits`;
    }

    const amt = parseFloat(amountRupees.trim());
    if (isNaN(amt) || amt < 0) {
      newErrors.amount = 'Please enter a valid amount (≥ 0)';
    }

    if (kind === 'credit') {
      const limit = parseFloat(creditLimitRupees.trim());
      if (isNaN(limit) || limit < 0) {
        newErrors.creditLimit = 'Please enter a valid credit limit';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSave = async () => {
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      const startingAmountPaise = paiseFromRupees(parseFloat(amountRupees.trim()) || 0);
      const creditLimitPaise =
        kind === 'credit' ? paiseFromRupees(parseFloat(creditLimitRupees.trim()) || 0) : undefined;

      const input = {
        bankCode,
        customBankName: bankCode === 'other' ? customBankName.trim() : undefined,
        kind,
        network: activeNetwork,
        holderName: holderName.trim().toUpperCase(),
        number: digitsOnly(rawNumber),
        expiry: expiry.trim(),
        cvv: digitsOnly(cvv),
        startingAmountPaise,
        creditLimitPaise,
      };

      if (isEdit && id) {
        await cardRepo.update(id, input);
      } else {
        await cardRepo.create(input);
      }

      router.back();
    } catch (err: any) {
      console.error('Failed to save card', err);
      Alert.alert('Save Failed', err?.message || 'Could not save card to hardware vault.');
    } finally {
      setSubmitting(false);
    }
  };

  const bankOptions: ChipOption<BankCode>[] = BANK_ORDER.map((code) => ({
    value: code,
    label: BANKS[code].shortName,
    color: BANKS[code].brand,
  }));

  const kindOptions: ChipOption<CardKind>[] = [
    { value: 'debit', label: 'Debit Card', color: '#00F0FF' },
    { value: 'credit', label: 'Credit Card', color: '#FFD700' },
  ];

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#00F0FF" />
        <Text style={styles.loadingText}>Accessing Secure Keystore…</Text>
      </View>
    );
  }

  const numberDigits = digitsOnly(rawNumber);
  const isNumberComplete = numberDigits.length === expectedLength(activeNetwork);
  const isLuhnValid = isNumberComplete && isValidLuhn(numberDigits);

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, Spacing.three),
              paddingBottom: insets.bottom + BottomTabInset + Spacing.six + 48,
            },
          ]}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={[styles.header, { width: cardWidth }]}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.backBtn}>‹ Back</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{isEdit ? 'EDIT CARD' : 'ADD CARD'}</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Live Card Preview */}
          <View style={styles.previewContainer}>
            <BankCard
              bank={bankCode}
              customBankName={customBankName || undefined}
              kind={kind}
              network={activeNetwork}
              holderName={holderName || 'CARDHOLDER NAME'}
              lastFour={numberDigits.slice(-4) || '••••'}
              fullNumber={formatCardNumber(rawNumber, activeNetwork) || '•••• •••• •••• ••••'}
              expiry={expiry || 'MM/YY'}
              cvv={cvv ? cvv.replace(/./g, '•') : '•••'}
              width={cardWidth}
            />
            <Text style={styles.previewCaption}>
              {kind === 'credit' ? '24K Liquid Carbon Credit Tier' : 'Cyber Titanium Debit Tier'}
            </Text>
          </View>

          {/* Form Card Container */}
          <View style={[styles.formContainer, { width: cardWidth }]}>
            {/* Bank Selection */}
            <ChipGroup
              label="SELECT ISSUING BANK"
              options={bankOptions}
              selected={bankCode}
              onSelect={(val) => setBankCode(val)}
            />

            {bankCode === 'other' ? (
              <Field
                label="CUSTOM BANK NAME"
                value={customBankName}
                onChangeText={setCustomBankName}
                placeholder="e.g. Kotak Mahindra Bank"
                error={errors.customBankName}
                autoCapitalize="words"
              />
            ) : null}

            {/* Card Kind */}
            <ChipGroup
              label="CARD TYPE"
              options={kindOptions}
              selected={kind}
              onSelect={(val) => setKind(val)}
            />

            {/* Card Number */}
            <Field
              label="CARD NUMBER"
              value={formatCardNumber(rawNumber, activeNetwork)}
              onChangeText={handleNumberChange}
              placeholder="0000 0000 0000 0000"
              keyboardType="number-pad"
              error={errors.number}
              hint={
                isNumberComplete
                  ? isLuhnValid
                    ? '✓ Luhn checksum verified'
                    : '⚠ Invalid card number checksum'
                  : `Enter ${expectedLength(activeNetwork)} digits`
              }
              rightElement={
                isNumberComplete ? (
                  <Text style={[styles.validBadge, isLuhnValid ? styles.badgeSuccess : styles.badgeDanger]}>
                    {isLuhnValid ? 'VALID' : 'INVALID'}
                  </Text>
                ) : null
              }
            />

            {/* Network Override */}
            <ChipGroup
              label="PAYMENT NETWORK"
              options={NETWORK_OPTIONS}
              selected={activeNetwork}
              onSelect={(net) => setManualNetwork(net)}
            />

            {/* Name on Card */}
            <Field
              label="CARDHOLDER NAME"
              value={holderName}
              onChangeText={(text) => {
                setHolderName(text.toUpperCase());
                if (errors.holderName) setErrors((prev) => ({ ...prev, holderName: '' }));
              }}
              placeholder="AS PRINTED ON CARD"
              autoCapitalize="characters"
              error={errors.holderName}
            />

            {/* Expiry & CVV Row */}
            <View style={styles.row}>
              <Field
                label="EXPIRY"
                value={expiry}
                onChangeText={handleExpiryChange}
                placeholder="MM/YY"
                keyboardType="number-pad"
                maxLength={5}
                error={errors.expiry}
                style={{ flex: 1 }}
              />
              <Field
                label="CVV / CVC"
                value={cvv}
                onChangeText={(text) => {
                  const maxCvv = activeNetwork === 'amex' ? 4 : 3;
                  setCvv(digitsOnly(text).slice(0, maxCvv));
                  if (errors.cvv) setErrors((prev) => ({ ...prev, cvv: '' }));
                }}
                placeholder={activeNetwork === 'amex' ? '4 digits' : '3 digits'}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={activeNetwork === 'amex' ? 4 : 3}
                error={errors.cvv}
                style={{ flex: 1 }}
              />
            </View>

            {/* Balance / Limits */}
            {kind === 'debit' ? (
              <Field
                label="CURRENT ACCOUNT BALANCE"
                value={amountRupees}
                onChangeText={(text) => {
                  setAmountRupees(text);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                }}
                placeholder="0.00"
                prefix="₹"
                keyboardType="numeric"
                hint="Opening ledger balance for this debit account"
                error={errors.amount}
              />
            ) : (
              <>
                <Field
                  label="CURRENT OUTSTANDING (DEBT)"
                  value={amountRupees}
                  onChangeText={(text) => {
                    setAmountRupees(text);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: '' }));
                  }}
                  placeholder="0.00"
                  prefix="₹"
                  keyboardType="numeric"
                  hint="Positive amount you currently owe on this card"
                  error={errors.amount}
                />
                <Field
                  label="TOTAL CREDIT LIMIT"
                  value={creditLimitRupees}
                  onChangeText={(text) => {
                    setCreditLimitRupees(text);
                    if (errors.creditLimit) setErrors((prev) => ({ ...prev, creditLimit: '' }));
                  }}
                  placeholder="e.g. 150000"
                  prefix="₹"
                  keyboardType="numeric"
                  hint="Approved credit limit from your statement"
                  error={errors.creditLimit}
                />
              </>
            )}

            {/* Security Guarantee Notice */}
            <View style={styles.vaultNotice}>
              <Text style={styles.vaultIcon}>🔒</Text>
              <Text style={styles.vaultText}>
                Encrypted in hardware Keystore. Never saved to cloud or SQLite database.
              </Text>
            </View>

            {/* Action Button */}
            <PrimaryButton
              label={isEdit ? 'SAVE CHANGES' : 'SECURE & SAVE CARD'}
              tone="accent"
              loading={submitting}
              onPress={handleSave}
              style={{ marginTop: Spacing.two }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07090E' },
  center: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { color: '#8A96AD', fontSize: 14, fontWeight: '600' },
  scrollContent: { alignItems: 'center', gap: Spacing.four, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { color: '#00F0FF', fontSize: 15, fontWeight: '700' },
  headerTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  previewContainer: { alignItems: 'center', gap: 8 },
  previewCaption: { color: '#65738E', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  formContainer: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  row: { flexDirection: 'row', gap: Spacing.three },
  validBadge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeSuccess: { backgroundColor: 'rgba(0,230,118,0.18)', color: '#00E676' },
  badgeDanger: { backgroundColor: 'rgba(255,107,97,0.18)', color: '#FF6B61' },
  vaultNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,240,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    borderRadius: 12,
    padding: Spacing.three,
  },
  vaultIcon: { fontSize: 16 },
  vaultText: { flex: 1, color: '#8A96AD', fontSize: 11, lineHeight: 16 },
});