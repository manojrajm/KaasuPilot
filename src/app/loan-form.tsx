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

import { ChipGroup, ChipOption, Field, PrimaryButton } from '@/components/forms/FormFields';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { loanRepo } from '@/data/repositories/loanRepo';
import { calculateEmi } from '@/domain/loans/amortisation';
import {
  emiTooLowToRepay,
  instalmentsDueSoFar,
  outstandingAfter,
  startDateFromFirstEmi,
} from '@/domain/loans/schedule';
import { formatPaise } from '@/domain/money/format';
import { paiseFromRupees, rupeesFromPaise } from '@/domain/money/paise';
import { LoanType } from '@/domain/types';
import { useAccounts } from '@/hooks/useAccounts';

const LOAN_TYPE_OPTIONS: ChipOption<LoanType>[] = [
  { value: 'home', label: '🏠 Home', color: '#00F0FF' },
  { value: 'auto', label: '🚗 Auto', color: '#FFD700' },
  { value: 'personal', label: '💳 Personal', color: '#00E676' },
  { value: 'gold', label: '🪙 Gold', color: '#FFB800' },
  { value: 'education', label: '🎓 Education', color: '#8A96AD' },
];

const LENDER_PRESETS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Indian Bank',
  'Other',
];

export default function LoanFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - Spacing.four * 2, MaxContentWidth, 480);

  const { accounts } = useAccounts();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState<LoanType>('auto');
  const [lenderPreset, setLenderPreset] = useState('State Bank of India');
  const [customLender, setCustomLender] = useState('');

  const [principalRupees, setPrincipalRupees] = useState('');
  const [ratePercent, setRatePercent] = useState('');
  const [tenureMonthsStr, setTenureMonthsStr] = useState('');

  // First EMI Date: DD, MM, YYYY
  const now = new Date();
  const [firstEmiDay, setFirstEmiDay] = useState(String(now.getDate()).padStart(2, '0'));
  const [firstEmiMonth, setFirstEmiMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [firstEmiYear, setFirstEmiYear] = useState(String(now.getFullYear()));

  // EMI Settings
  const [emiIsCustom, setEmiIsCustom] = useState(false);
  const [customEmiRupees, setCustomEmiRupees] = useState('');

  // Instalments paid & Outstanding
  const [monthsPaidStr, setMonthsPaidStr] = useState('0');
  const [balanceRupees, setBalanceRupees] = useState('');
  const [hasManuallyEditedBalance, setHasManuallyEditedBalance] = useState(false);

  // Processing Fee & Account
  const [feeRupees, setFeeRupees] = useState('0');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Account options for EMI debiting
  const accountOptions: ChipOption<string>[] = useMemo(() => {
    return accounts.map((a) => ({
      value: a.id,
      label: a.name,
      color: a.color ?? '#00F0FF',
    }));
  }, [accounts]);

  // Default account selection
  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  // Load existing loan in edit mode
  useEffect(() => {
    if (!id) return;
    let active = true;

    async function loadLoan() {
      try {
        const loan = await loanRepo.getById(id!);
        if (!loan) {
          Alert.alert('Loan Not Found', 'Could not locate this loan record.');
          if (active) router.back();
          return;
        }

        if (!active) return;
        setName(loan.name);
        setType(loan.type);

        if (LENDER_PRESETS.includes(loan.lender)) {
          setLenderPreset(loan.lender);
        } else {
          setLenderPreset('Other');
          setCustomLender(loan.lender);
        }

        setPrincipalRupees(rupeesFromPaise(loan.principalPaise).toString());
        setRatePercent((loan.annualRateBps / 100).toFixed(2));
        setTenureMonthsStr(loan.tenureMonths.toString());

        // Compute first EMI date from loan.startDate (startDate is 1 month before first EMI)
        const start = new Date(loan.startDate);
        const firstEmiDate = new Date(start.getFullYear(), start.getMonth() + 1, loan.dueDayOfMonth);
        setFirstEmiDay(String(firstEmiDate.getDate()).padStart(2, '0'));
        setFirstEmiMonth(String(firstEmiDate.getMonth() + 1).padStart(2, '0'));
        setFirstEmiYear(String(firstEmiDate.getFullYear()));

        setEmiIsCustom(Boolean(loan.emiIsCustom));
        setCustomEmiRupees(rupeesFromPaise(loan.emiPaise).toString());

        setMonthsPaidStr(loan.monthsPaid.toString());
        setBalanceRupees(rupeesFromPaise(loan.balancePaise).toString());
        setHasManuallyEditedBalance(true);

        setFeeRupees(rupeesFromPaise(loan.processingFeePaise ?? 0).toString());
        setSelectedAccountId(loan.accountId);
      } catch (err) {
        console.error('Failed to load loan', err);
        Alert.alert('Error', 'Failed to load loan.');
        if (active) router.back();
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLoan();
    return () => {
      active = false;
    };
  }, [id, router]);

  // Computed Values
  const principalPaise = paiseFromRupees(parseFloat(principalRupees.trim()) || 0);
  const annualRateBps = Math.round((parseFloat(ratePercent.trim()) || 0) * 100);
  const tenureMonths = parseInt(tenureMonthsStr.trim(), 10) || 0;
  const monthsPaid = parseInt(monthsPaidStr.trim(), 10) || 0;

  const autoEmiPaise = useMemo(() => {
    return calculateEmi(principalPaise, annualRateBps, tenureMonths);
  }, [principalPaise, annualRateBps, tenureMonths]);

  const activeEmiPaise = emiIsCustom
    ? paiseFromRupees(parseFloat(customEmiRupees.trim()) || 0)
    : autoEmiPaise;

  // Auto-update balance suggestion if user hasn't manually overridden it
  useEffect(() => {
    if (isEdit || hasManuallyEditedBalance) return;
    if (principalPaise > 0 && annualRateBps > 0 && activeEmiPaise > 0) {
      const suggested = outstandingAfter(principalPaise, annualRateBps, activeEmiPaise, monthsPaid);
      setBalanceRupees(rupeesFromPaise(suggested).toString());
    }
  }, [principalPaise, annualRateBps, activeEmiPaise, monthsPaid, isEdit, hasManuallyEditedBalance]);

  // Check if EMI is too low
  const isEmiTooLow = useMemo(() => {
    const bal = paiseFromRupees(parseFloat(balanceRupees.trim()) || 0);
    return emiTooLowToRepay(bal, annualRateBps, activeEmiPaise);
  }, [balanceRupees, annualRateBps, activeEmiPaise]);

  // Tenure hint in years
  const tenureHint = useMemo(() => {
    if (!tenureMonths) return 'e.g. 60 for 5 years';
    const yrs = (tenureMonths / 12).toFixed(1).replace(/\.0$/, '');
    return `${tenureMonths} months ≈ ${yrs} years`;
  }, [tenureMonths]);

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Loan name is required';
    if (lenderPreset === 'Other' && !customLender.trim()) {
      newErrors.customLender = 'Enter lender name';
    }

    if (principalPaise <= 0) newErrors.principal = 'Enter a valid principal amount';
    if (annualRateBps <= 0) newErrors.rate = 'Enter interest rate';
    if (tenureMonths <= 0) newErrors.tenure = 'Enter tenure in months';

    const d = parseInt(firstEmiDay, 10);
    const m = parseInt(firstEmiMonth, 10);
    const y = parseInt(firstEmiYear, 10);
    if (isNaN(d) || d < 1 || d > 31 || isNaN(m) || m < 1 || m > 12 || isNaN(y) || y < 2000) {
      newErrors.firstEmi = 'Enter a valid date (DD / MM / YYYY)';
    }

    if (activeEmiPaise <= 0) newErrors.emi = 'EMI must be greater than zero';
    if (monthsPaid < 0 || monthsPaid > tenureMonths) {
      newErrors.monthsPaid = `Must be between 0 and ${tenureMonths}`;
    }

    const bal = paiseFromRupees(parseFloat(balanceRupees.trim()) || 0);
    if (bal < 0) newErrors.balance = 'Outstanding cannot be negative';

    if (isEmiTooLow) {
      newErrors.emi = 'EMI does not even cover monthly interest!';
    }

    if (!selectedAccountId) {
      newErrors.account = 'Select an account to debit EMIs from';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const lender = lenderPreset === 'Other' ? customLender.trim() : lenderPreset;
      const d = parseInt(firstEmiDay, 10);
      const m = parseInt(firstEmiMonth, 10) - 1;
      const y = parseInt(firstEmiYear, 10);
      const firstEmiDate = new Date(y, m, d);

      const balPaise = paiseFromRupees(parseFloat(balanceRupees.trim()) || 0);
      const feePaise = paiseFromRupees(parseFloat(feeRupees.trim()) || 0);

      const input = {
        name: name.trim(),
        type,
        lender,
        principalPaise,
        annualRateBps,
        tenureMonths,
        firstEmiDate,
        emiPaise: activeEmiPaise,
        emiIsCustom,
        monthsPaid,
        balancePaise: balPaise,
        processingFeePaise: feePaise,
        accountId: selectedAccountId,
      };

      if (isEdit && id) {
        await loanRepo.update(id, input);
      } else {
        await loanRepo.create(input);
      }

      router.back();
    } catch (err: any) {
      console.error('Failed to save loan', err);
      Alert.alert('Save Failed', err?.message || 'Could not save loan to database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan record? Existing past EMI transaction entries in your ledger will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await loanRepo.remove(id!);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete loan.');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  const lenderOptions: ChipOption<string>[] = LENDER_PRESETS.map((p) => ({
    value: p,
    label: p,
    color: '#00F0FF',
  }));

  const emiToggleOptions: ChipOption<boolean>[] = [
    { value: false, label: '⚡ Auto-Calculate' },
    { value: true, label: '✏️ Bank Custom' },
  ];

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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={[styles.header, { width: contentWidth }]}>
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.backBtn}>‹ Cockpit</Text>
            </Pressable>
            <Text style={styles.headerTitle}>{isEdit ? 'EDIT LOAN' : 'NEW LOAN FACILITY'}</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Form Card 1: Identity */}
          <View style={[styles.sectionCard, { width: contentWidth }]}>
            <Text style={styles.cardHeaderTitle}>1. LOAN IDENTITY</Text>

            <Field
              label="LOAN NAME"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Tata Nexon EV Loan"
              error={errors.name}
            />

            <ChipGroup
              label="ASSET CLASS / TYPE"
              options={LOAN_TYPE_OPTIONS}
              selected={type}
              onSelect={setType}
            />

            <ChipGroup
              label="LENDING INSTITUTION"
              options={lenderOptions}
              selected={lenderPreset}
              onSelect={setLenderPreset}
              scrollable
            />

            {lenderPreset === 'Other' ? (
              <Field
                label="CUSTOM LENDER NAME"
                value={customLender}
                onChangeText={setCustomLender}
                placeholder="e.g. Bajaj Finserv"
                error={errors.customLender}
              />
            ) : null}
          </View>

          {/* Form Card 2: Financial Terms */}
          <View style={[styles.sectionCard, { width: contentWidth }]}>
            <Text style={styles.cardHeaderTitle}>2. PRINCIPAL & INTEREST</Text>

            <Field
              label="LOAN AMOUNT (PRINCIPAL)"
              value={principalRupees}
              onChangeText={setPrincipalRupees}
              placeholder="e.g. 1200000"
              prefix="₹"
              keyboardType="numeric"
              error={errors.principal}
            />

            <View style={styles.row}>
              <Field
                label="INTEREST RATE (% P.A.)"
                value={ratePercent}
                onChangeText={setRatePercent}
                placeholder="e.g. 8.75"
                suffix="%"
                keyboardType="numeric"
                error={errors.rate}
                style={{ flex: 1 }}
              />

              <Field
                label="TENURE (MONTHS)"
                value={tenureMonthsStr}
                onChangeText={setTenureMonthsStr}
                placeholder="60"
                keyboardType="number-pad"
                hint={tenureHint}
                error={errors.tenure}
                style={{ flex: 1 }}
              />
            </View>
          </View>

          {/* Form Card 3: Timeline & EMI */}
          <View style={[styles.sectionCard, { width: contentWidth }]}>
            <Text style={styles.cardHeaderTitle}>3. REPAYMENT TIMELINE & EMI</Text>

            {/* First EMI Date */}
            <View>
              <Text style={styles.inputGroupLabel}>FIRST EMI COMMENCEMENT DATE</Text>
              <View style={styles.dateRow}>
                <Field
                  label="DAY"
                  value={firstEmiDay}
                  onChangeText={setFirstEmiDay}
                  placeholder="DD"
                  keyboardType="number-pad"
                  maxLength={2}
                  style={{ flex: 1 }}
                />
                <Field
                  label="MONTH"
                  value={firstEmiMonth}
                  onChangeText={setFirstEmiMonth}
                  placeholder="MM"
                  keyboardType="number-pad"
                  maxLength={2}
                  style={{ flex: 1 }}
                />
                <Field
                  label="YEAR"
                  value={firstEmiYear}
                  onChangeText={setFirstEmiYear}
                  placeholder="YYYY"
                  keyboardType="number-pad"
                  maxLength={4}
                  style={{ flex: 1.4 }}
                />
              </View>
              {errors.firstEmi ? <Text style={styles.errorInline}>{errors.firstEmi}</Text> : null}
            </View>

            {/* EMI Mode Toggle */}
            <ChipGroup
              label="MONTHLY EMI VALUATION"
              options={emiToggleOptions}
              selected={emiIsCustom}
              onSelect={setEmiIsCustom}
            />

            {emiIsCustom ? (
              <Field
                label="BANK'S EXACT MONTHLY EMI"
                value={customEmiRupees}
                onChangeText={setCustomEmiRupees}
                placeholder="e.g. 24500"
                prefix="₹"
                keyboardType="numeric"
                hint="Use exact monthly instalment figure from sanction letter"
                error={errors.emi}
              />
            ) : (
              <View style={styles.computedEmiBox}>
                <Text style={styles.computedEmiLabel}>ACTUARIAL REDUCING EMI</Text>
                <Text style={styles.computedEmiValue}>{formatPaise(autoEmiPaise)} / mo</Text>
                <Text style={styles.computedEmiSub}>
                  Exact mathematical reducing-balance calculation based on tenure and APR.
                </Text>
                {errors.emi ? <Text style={styles.errorInline}>{errors.emi}</Text> : null}
              </View>
            )}

            {/* Instalments Paid */}
            <Field
              label="EMIS ALREADY PAID"
              value={monthsPaidStr}
              onChangeText={setMonthsPaidStr}
              placeholder="0"
              keyboardType="number-pad"
              hint={`Completed instalments (0 to ${tenureMonths})`}
              error={errors.monthsPaid}
            />
          </View>

          {/* Form Card 4: Ledger & Balances */}
          <View style={[styles.sectionCard, { width: contentWidth }]}>
            <Text style={styles.cardHeaderTitle}>4. LEDGER INTEGRATION</Text>

            <Field
              label="CURRENT OUTSTANDING BALANCE"
              value={balanceRupees}
              onChangeText={(text) => {
                setBalanceRupees(text);
                setHasManuallyEditedBalance(true);
              }}
              placeholder="0.00"
              prefix="₹"
              keyboardType="numeric"
              hint="Check latest net principal balance from loan statement"
              error={errors.balance}
            />

            <Field
              label="PROCESSING FEE (OPTIONAL)"
              value={feeRupees}
              onChangeText={setFeeRupees}
              placeholder="0.00"
              prefix="₹"
              keyboardType="numeric"
            />

            {/* Debit Account Chips */}
            <ChipGroup
              label="PAY EMI FROM ACCOUNT"
              options={accountOptions}
              selected={selectedAccountId}
              onSelect={setSelectedAccountId}
            />
            {errors.account ? <Text style={styles.errorInline}>{errors.account}</Text> : null}
          </View>

          {/* Save & Actions */}
          <View style={[{ width: contentWidth, gap: Spacing.three, marginTop: Spacing.two }]}>
            <PrimaryButton
              label={isEdit ? 'UPDATE LOAN FACILITY' : 'COMMISSION LOAN TO COCKPIT'}
              tone="accent"
              loading={submitting}
              onPress={handleSave}
            />

            {isEdit ? (
              <PrimaryButton
                label="DELETE LOAN"
                tone="danger"
                loading={deleting}
                onPress={handleDelete}
              />
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#07090E' },
  center: { justifyContent: 'center', alignItems: 'center' },
  scrollContent: { alignItems: 'center', gap: Spacing.four, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { color: '#00F0FF', fontSize: 15, fontWeight: '700' },
  headerTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
  sectionCard: {
    backgroundColor: '#0D111A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  cardHeaderTitle: { color: '#8A96AD', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  row: { flexDirection: 'row', gap: Spacing.three },
  dateRow: { flexDirection: 'row', gap: Spacing.two },
  inputGroupLabel: { color: '#8A96AD', fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  computedEmiBox: {
    backgroundColor: 'rgba(0,240,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.2)',
    borderRadius: 14,
    padding: Spacing.three,
    gap: 4,
  },
  computedEmiLabel: { color: '#00F0FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  computedEmiValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  computedEmiSub: { color: '#8A96AD', fontSize: 11, lineHeight: 15 },
  errorInline: { color: '#FF6B61', fontSize: 11, fontWeight: '600', marginTop: 4 },
});