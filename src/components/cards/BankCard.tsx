import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { themeFor } from '@/domain/cards/bankThemes';
import { formatCardNumber, maskCardNumber } from '@/domain/cards/cardNumber';
import { BankCode, CardKind, CardNetwork } from '@/domain/types';
import { BankLogo, NetworkLogo } from './CardLogos';

export interface BankCardProps {
  bank: BankCode;
  customBankName?: string;
  kind: CardKind;
  network: CardNetwork;
  holderName: string;
  lastFour: string;
  /** Full number; shown only when provided (after the user has unlocked it). */
  fullNumber?: string;
  expiry?: string;
  cvv?: string;
  /** Shows the back side (magnetic stripe + CVV) with a flip animation. */
  flipped?: boolean;
  /** Optional large line in the middle of the card, e.g. the available balance. */
  centerLabel?: string;
  centerValue?: string;
  centerValueColor?: string;
  width?: number;
  onPress?: () => void;
}

/** Standard ID-1 card proportions (85.60 × 53.98 mm). */
const ASPECT = 1.586;
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function Chip({ size }: { size: number }) {
  return (
    <LinearGradient
      colors={['#F6E27A', '#D4AF37', '#B8912A', '#E9CF6A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.chip, { width: size * 1.3, height: size }]}>
      <View style={[styles.chipLineH, { top: size * 0.33 }]} />
      <View style={[styles.chipLineH, { top: size * 0.66 }]} />
      <View style={[styles.chipLineV, { left: size * 0.43 }]} />
      <View style={[styles.chipLineV, { left: size * 0.86 }]} />
    </LinearGradient>
  );
}

function Contactless({ size, color }: { size: number; color: string }) {
  return (
    <View style={{ width: size, height: size, flexDirection: 'row', alignItems: 'center' }}>
      {[0.35, 0.6, 0.85].map((s) => (
        <View
          key={s}
          style={{
            position: 'absolute',
            left: 0,
            width: size * s,
            height: size * s,
            borderRadius: size,
            borderWidth: 2,
            borderColor: color,
            borderLeftColor: 'transparent',
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            marginLeft: -size * s * 0.35,
          }}
        />
      ))}
    </View>
  );
}

/**
 * A realistic payment card face drawn from the bank's colours:
 * gradient body with a light sheen, bank emblem, EMV chip, contactless mark,
 * embossed-style number and the card network's logo. Tapping can flip it to the back.
 */
export function BankCard({
  bank,
  customBankName,
  kind,
  network,
  holderName,
  lastFour,
  fullNumber,
  expiry,
  cvv,
  flipped = false,
  centerLabel,
  centerValue,
  centerValueColor,
  width = 320,
  onPress,
}: BankCardProps) {
  const theme = themeFor(bank, kind);
  const height = width / ASPECT;
  const unit = width / 320;
  const flip = useSharedValue(flipped ? 1 : 0);

  useEffect(() => {
    flip.value = withTiming(flipped ? 1 : 0, { duration: 520, easing: Easing.inOut(Easing.cubic) });
  }, [flipped, flip]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }],
    opacity: flip.value >= 0.5 ? 1 : 0,
  }));

  const numberText = fullNumber ? formatCardNumber(fullNumber, network) : maskCardNumber(lastFour || '••••');
  const emboss = {
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0.8, height: 1.2 },
    textShadowRadius: 0.8,
  };

  const shell = (children: React.ReactNode, extra?: object) => (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.face, { width, height, borderRadius: 14 * unit }, extra]}>
      {/* Decorative accent wave and soft sheen */}
      <View
        pointerEvents="none"
        style={[
          styles.wave,
          {
            width: width * 0.9,
            height: width * 0.9,
            borderRadius: width,
            right: -width * 0.42,
            top: -width * 0.3,
            borderColor: theme.accent,
          },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </LinearGradient>
  );

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ width, height }} accessibilityRole={onPress ? 'button' : undefined}>
      {/* FRONT */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backface, frontStyle]}>
        {shell(
          <View style={[styles.inner, { padding: 18 * unit }]}>
            <View style={styles.topRow}>
              <BankLogo bank={bank} color={theme.text} customName={customBankName} size={22 * unit} />
              <Text style={[styles.kindLabel, { color: theme.subText, fontSize: 10 * unit }]}>
                {kind === 'credit' ? 'CREDIT' : 'DEBIT'}
              </Text>
            </View>

            {centerValue ? (
              <View style={styles.centerBlock}>
                {centerLabel ? (
                  <Text style={[styles.centerLabel, { color: theme.subText, fontSize: 10 * unit }]}>{centerLabel}</Text>
                ) : null}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={[styles.centerValue, { color: centerValueColor ?? theme.text, fontSize: 30 * unit }]}>
                  {centerValue}
                </Text>
              </View>
            ) : (
              <View style={[styles.chipRow, { gap: 12 * unit }]}>
                <Chip size={30 * unit} />
                <Contactless size={24 * unit} color={theme.subText} />
              </View>
            )}

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.number, emboss, { color: theme.text, fontFamily: MONO, fontSize: (centerValue ? 15 : 20) * unit }]}>
              {numberText}
            </Text>

            <View style={styles.bottomRow}>
              <View style={styles.holderBlock}>
                {!centerValue ? (
                  <View style={styles.validRow}>
                    <Text style={[styles.validLabel, { color: theme.subText, fontSize: 6.5 * unit }]}>VALID{'\n'}THRU</Text>
                    <Text style={[styles.expiry, emboss, { color: theme.text, fontFamily: MONO, fontSize: 13 * unit }]}>
                      {expiry || 'MM/YY'}
                    </Text>
                  </View>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={[styles.holder, emboss, { color: theme.text, fontFamily: MONO, fontSize: 13 * unit }]}>
                  {holderName ? holderName.toUpperCase() : 'CARDHOLDER NAME'}
                </Text>
              </View>
              <NetworkLogo network={network} height={26 * unit} />
            </View>
          </View>
        )}
      </Animated.View>

      {/* BACK */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backface, backStyle]}>
        {shell(
          <View style={{ flex: 1 }}>
            <View style={[styles.stripe, { height: 40 * unit, marginTop: 22 * unit }]} />
            <View style={[styles.signatureRow, { marginTop: 16 * unit, paddingHorizontal: 18 * unit }]}>
              <View style={[styles.signature, { height: 34 * unit }]}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={styles.signatureLine} />
                ))}
              </View>
              <View style={[styles.cvvBox, { height: 34 * unit, width: 64 * unit }]}>
                <Text style={[styles.cvvText, { fontFamily: MONO, fontSize: 15 * unit }]}>{cvv || '•••'}</Text>
              </View>
            </View>
            <Text style={[styles.cvvCaption, { color: theme.subText, fontSize: 8 * unit, marginRight: 18 * unit }]}>CVV</Text>
            <View style={[styles.backBottom, { paddingHorizontal: 18 * unit, paddingBottom: 14 * unit }]}>
              <Text style={[styles.backNote, { color: theme.subText, fontSize: 7.5 * unit }]} numberOfLines={2}>
                Stored only on this phone · Never share your CVV or OTP
              </Text>
              <NetworkLogo network={network} height={20 * unit} />
            </View>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  backface: {
    backfaceVisibility: 'hidden',
  },
  wave: {
    position: 'absolute',
    borderWidth: 26,
    opacity: 0.16,
  },
  inner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  kindLabel: {
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    borderRadius: 5,
    overflow: 'hidden',
  },
  chipLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(90, 65, 10, 0.45)',
  },
  chipLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(90, 65, 10, 0.45)',
  },
  centerBlock: {
    gap: 2,
  },
  centerLabel: {
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  centerValue: {
    fontWeight: '800',
  },
  number: {
    letterSpacing: 2,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 10,
  },
  holderBlock: {
    flex: 1,
    gap: 4,
  },
  validRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validLabel: {
    fontWeight: '700',
    lineHeight: 8,
  },
  expiry: {
    letterSpacing: 1,
  },
  holder: {
    letterSpacing: 1.2,
  },
  stripe: {
    backgroundColor: '#111111',
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signature: {
    flex: 1,
    backgroundColor: '#F1EEE6',
    justifyContent: 'space-evenly',
    paddingHorizontal: 6,
  },
  signatureLine: {
    height: 1,
    backgroundColor: 'rgba(160, 150, 130, 0.55)',
  },
  cvvBox: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  cvvText: {
    color: '#111111',
    fontStyle: 'italic',
    letterSpacing: 2,
  },
  cvvCaption: {
    alignSelf: 'flex-end',
    fontWeight: '700',
    marginTop: 3,
  },
  backBottom: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  backNote: {
    flex: 1,
  },
});
