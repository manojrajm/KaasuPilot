import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BankCode, CardNetwork } from '@/domain/types';

/* -------------------------------------------------------------------------- */
/* Network marks                                                               */
/* -------------------------------------------------------------------------- */

export function NetworkLogo({ network, height = 26, onLight = false }: { network: CardNetwork; height?: number; onLight?: boolean }) {
  if (network === 'mastercard') {
    const d = height;
    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: d * 1.62, height: d, flexDirection: 'row' }}>
          <View style={[styles.mcCircle, { width: d, height: d, borderRadius: d / 2, backgroundColor: '#EB001B' }]} />
          <View
            style={[
              styles.mcCircle,
              { width: d, height: d, borderRadius: d / 2, backgroundColor: '#F79E1B', left: d * 0.62, opacity: 0.92 },
            ]}
          />
          {/* Overlap lens */}
          <View
            style={[
              styles.mcCircle,
              { width: d * 0.38, height: d * 0.86, borderRadius: d, backgroundColor: '#FF5F00', left: d * 0.62, top: d * 0.07 },
            ]}
          />
        </View>
        <Text style={[styles.mcWord, { color: onLight ? '#231F20' : '#FFFFFF', fontSize: height * 0.3 }]}>mastercard</Text>
      </View>
    );
  }

  if (network === 'rupay') {
    const h = height * 0.42;
    return (
      <View style={styles.rupayRow}>
        <Text style={[styles.rupayWord, { fontSize: height * 0.72, color: onLight ? '#1E2A78' : '#FFFFFF' }]}>
          Ru<Text style={styles.rupayPay}>Pay</Text>
        </Text>
        <View style={{ marginLeft: 2, flexDirection: 'row' }}>
          <View style={[styles.triangle, { borderTopWidth: h, borderBottomWidth: h, borderLeftWidth: h * 1.2, borderLeftColor: '#F37021' }]} />
          <View
            style={[
              styles.triangle,
              { borderTopWidth: h, borderBottomWidth: h, borderLeftWidth: h * 1.2, borderLeftColor: '#00A650', marginLeft: -h * 0.45 },
            ]}
          />
        </View>
      </View>
    );
  }

  if (network === 'amex') {
    return (
      <View style={[styles.amexBox, { height, paddingHorizontal: height * 0.25 }]}>
        <Text style={[styles.amexText, { fontSize: height * 0.42 }]}>AMERICAN{'\n'}EXPRESS</Text>
      </View>
    );
  }

  if (network === 'diners') {
    return <Text style={[styles.genericNetwork, { fontSize: height * 0.5 }]}>Diners Club</Text>;
  }

  if (network === 'visa') {
    return (
      <Text
        style={[styles.visaWord, { fontSize: height * 0.95, color: onLight ? '#1A1F71' : '#FFFFFF' }]}
        accessibilityLabel="Visa">
        VISA
      </Text>
    );
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Bank marks — simplified geometric versions of each bank's emblem            */
/* -------------------------------------------------------------------------- */

function SbiMark({ size }: { size: number }) {
  // Circle with a keyhole cut-out.
  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF' }]}>
      <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size, backgroundColor: '#22409A', marginTop: -size * 0.12 }} />
      <View style={{ position: 'absolute', bottom: 0, width: size * 0.12, height: size * 0.5, backgroundColor: '#22409A' }} />
    </View>
  );
}

function HdfcMark({ size }: { size: number }) {
  // Red frame, white square, navy core with a white bar.
  return (
    <View style={[styles.center, { width: size, height: size, backgroundColor: '#ED232A' }]}>
      <View style={[styles.center, { width: size * 0.74, height: size * 0.74, backgroundColor: '#FFFFFF' }]}>
        <View style={[styles.center, { width: size * 0.46, height: size * 0.46, backgroundColor: '#004C8F' }]}>
          <View style={{ width: size * 0.08, height: size * 0.46, backgroundColor: '#FFFFFF' }} />
        </View>
      </View>
    </View>
  );
}

function IciciMark({ size }: { size: number }) {
  // Tilted maroon lozenge with an orange-dotted "i".
  return (
    <View
      style={[
        styles.center,
        {
          width: size * 0.8,
          height: size,
          borderRadius: size * 0.42,
          backgroundColor: '#AE282E',
          transform: [{ rotate: '-18deg' }],
          borderWidth: 1.5,
          borderColor: '#F37E20',
        },
      ]}>
      <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: size, backgroundColor: '#F37E20', marginBottom: size * 0.06 }} />
      <View style={{ width: size * 0.14, height: size * 0.42, borderRadius: size * 0.05, backgroundColor: '#FFFFFF' }} />
    </View>
  );
}

function AxisMark({ size }: { size: number }) {
  // Burgundy "A" triangle with the open cut-out.
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={[
          styles.triangleUp,
          { borderLeftWidth: size / 2, borderRightWidth: size / 2, borderBottomWidth: size * 0.9, borderBottomColor: '#FFFFFF' },
        ]}
      />
      <View
        style={[
          styles.triangleUp,
          {
            position: 'absolute',
            bottom: 0,
            borderLeftWidth: size * 0.2,
            borderRightWidth: size * 0.2,
            borderBottomWidth: size * 0.36,
            borderBottomColor: '#97144D',
          },
        ]}
      />
    </View>
  );
}

function IndianBankMark({ size }: { size: number }) {
  // Yellow disc with a navy arc, echoing the bank's circular emblem.
  return (
    <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: '#F7A800' }]}>
      <View
        style={{
          width: size * 0.7,
          height: size * 0.7,
          borderRadius: size,
          borderWidth: size * 0.12,
          borderColor: '#1B3F8F',
          borderBottomColor: 'transparent',
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View style={{ position: 'absolute', width: size * 0.18, height: size * 0.18, borderRadius: size, backgroundColor: '#1B3F8F' }} />
    </View>
  );
}

const WORDMARK: Record<BankCode, { text: string; italic?: boolean; spacing?: number }> = {
  sbi: { text: 'SBI', spacing: 1 },
  indian: { text: 'Indian Bank' },
  hdfc: { text: 'HDFC BANK', spacing: 0.5 },
  icici: { text: 'ICICI Bank', italic: true },
  axis: { text: 'AXIS BANK', spacing: 1 },
  other: { text: 'BANK' },
};

/** Bank emblem + wordmark as shown in the card's top-left corner. */
export function BankLogo({
  bank,
  color,
  customName,
  size = 24,
}: {
  bank: BankCode;
  color: string;
  customName?: string;
  size?: number;
}) {
  const word = WORDMARK[bank];
  const text = bank === 'other' && customName ? customName.toUpperCase() : word.text;
  return (
    <View style={styles.bankRow}>
      {bank === 'sbi' ? <SbiMark size={size} /> : null}
      {bank === 'hdfc' ? <HdfcMark size={size} /> : null}
      {bank === 'icici' ? <IciciMark size={size} /> : null}
      {bank === 'axis' ? <AxisMark size={size} /> : null}
      {bank === 'indian' ? <IndianBankMark size={size} /> : null}
      <Text
        numberOfLines={1}
        style={[
          styles.bankWord,
          {
            color,
            fontSize: size * 0.72,
            fontStyle: word.italic ? 'italic' : 'normal',
            letterSpacing: word.spacing ?? 0,
          },
        ]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mcCircle: {
    position: 'absolute',
  },
  mcWord: {
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  rupayRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rupayWord: {
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  rupayPay: {
    fontWeight: '900',
  },
  triangle: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  triangleUp: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  amexBox: {
    backgroundColor: '#2E77BC',
    borderRadius: 3,
    justifyContent: 'center',
  },
  amexText: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 11,
  },
  genericNetwork: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  visaWord: {
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  bankWord: {
    fontWeight: '800',
    flexShrink: 1,
  },
});
