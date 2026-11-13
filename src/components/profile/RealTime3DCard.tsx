import React, { useRef } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ConnectedCard } from '@/domain/profile/types';
import { formatPaise } from '@/domain/money/format';

interface RealTime3DCardProps {
  card: ConnectedCard;
}

export function RealTime3DCard({ card }: RealTime3DCardProps) {
  // 3D rotation angles driven by touch/drag
  const rotateX = useRef(new Animated.Value(0)).current;
  const rotateY = useRef(new Animated.Value(0)).current;
  const sheenPos = useRef(new Animated.Value(0.5)).current;

  // PanResponder to track interactive finger drag across the card
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gestureState) => {
        // Clamp and map gestures to subtle 3D degrees (-16deg to +16deg)
        const dx = Math.max(-100, Math.min(100, gestureState.dx));
        const dy = Math.max(-70, Math.min(70, gestureState.dy));

        rotateY.setValue(dx * 0.16);
        rotateX.setValue(-dy * 0.16);

        // Shift the specular sheen reflection
        sheenPos.setValue(0.5 + (dx / 200));
      },
      onPanResponderRelease: () => {
        // Smoothly spring back to rest
        Animated.parallel([
          Animated.spring(rotateX, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(rotateY, {
            toValue: 0,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
          }),
          Animated.spring(sheenPos, {
            toValue: 0.5,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start();
      },
    })
  ).current;

  // Interpolations for 3D rotation strings
  const rotateXStr = rotateX.interpolate({
    inputRange: [-20, 20],
    outputRange: ['-20deg', '20deg'],
  });

  const rotateYStr = rotateY.interpolate({
    inputRange: [-20, 20],
    outputRange: ['-20deg', '20deg'],
  });

  const sheenTranslateX = sheenPos.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 120],
  });

  const isMastercard = card.cardType === 'mastercard';

  return (
    <View style={styles.outerContainer}>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card3DWrapper,
          {
            transform: [
              { perspective: 1000 },
              { rotateX: rotateXStr },
              { rotateY: rotateYStr },
            ],
            borderColor: `${card.accentGlow}60`,
            shadowColor: card.accentGlow,
          },
        ]}>
        {/* Brushed Metal Background Layer */}
        <View
          style={[
            styles.cardSurface,
            { backgroundColor: card.colorGradient[0] },
          ]}>
          {/* Top Half Gradient Overlay */}
          <View
            style={[
              styles.gradientOverlay,
              { backgroundColor: card.colorGradient[1] },
            ]}
          />

          {/* Interactive Specular Metallic Glare / Sheen Streak */}
          <Animated.View
            style={[
              styles.sheenStreak,
              {
                transform: [
                  { translateX: sheenTranslateX },
                  { rotate: '25deg' },
                ],
              },
            ]}
          />

          {/* Fine Brushed Texture Lines */}
          <View style={styles.brushLine1} />
          <View style={styles.brushLine2} />

          {/* ======================================================== */}
          {/* CARD FACE CONTENTS                                        */}
          {/* ======================================================== */}
          <View style={styles.cardContent}>
            {/* Top Row: Bank Name + Contactless Symbol */}
            <View style={styles.topRow}>
              <View style={styles.bankNameCol}>
                <Text style={styles.bankNameText}>{card.bankName}</Text>
                <Text style={styles.cardTitleText}>{card.cardTitle}</Text>
              </View>

              {/* Contactless NFC Waves Glyph */}
              <View style={styles.nfcContainer}>
                <View style={styles.nfcWave1} />
                <View style={styles.nfcWave2} />
                <View style={styles.nfcWave3} />
              </View>
            </View>

            {/* Middle Row: Photorealistic EMV Gold Chip */}
            <View style={styles.chipRow}>
              <View style={styles.emvChip}>
                {/* Chip internal contact division lines */}
                <View style={styles.chipLineH} />
                <View style={styles.chipLineV1} />
                <View style={styles.chipLineV2} />
                <View style={styles.chipCenterPad} />
              </View>

              {/* Balance Badge */}
              <View style={styles.balanceBadge}>
                <Text style={styles.balanceLabel}>
                  {card.isCredit ? 'CURRENT DUE' : 'AVAILABLE BALANCE'}
                </Text>
                <Text
                  style={[
                    styles.balanceValue,
                    card.isCredit && styles.balanceCredit,
                  ]}>
                  {formatPaise(card.balancePaise)}
                </Text>
              </View>
            </View>

            {/* Card Number: Embossed Masked Digits */}
            <View style={styles.numberRow}>
              <Text style={styles.embossedNumber}>
                {card.accountNumberMasked}
              </Text>
            </View>

            {/* Bottom Row: Cardholder Name, Expiry, and Network Logo */}
            <View style={styles.bottomRow}>
              <View style={styles.holderCol}>
                <Text style={styles.holderLabel}>CARDHOLDER</Text>
                <Text style={styles.holderName}>{card.cardHolder}</Text>
              </View>

              <View style={styles.expiryCol}>
                <Text style={styles.expiryLabel}>VALID THRU</Text>
                <Text style={styles.expiryDate}>{card.expiryStr}</Text>
              </View>

              {/* Network Brand Hologram */}
              {isMastercard ? (
                <View style={styles.mastercardPill}>
                  <View style={styles.mcCircleRed} />
                  <View style={styles.mcCircleAmber} />
                </View>
              ) : (
                <View style={styles.visaPill}>
                  <Text style={styles.visaText}>VISA</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>

      <Text style={styles.dragHintText}>
        👆 Touch & Drag to inspect real-time 3D metallic sheen
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  card3DWrapper: {
    width: 326,
    height: 196,
    borderRadius: 20,
    borderWidth: 1.6,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.65,
    shadowRadius: 28,
    elevation: 18,
    backgroundColor: '#07090E',
  },
  cardSurface: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    opacity: 0.75,
  },
  sheenStreak: {
    position: 'absolute',
    top: -50,
    bottom: -50,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  brushLine1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '25%',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  brushLine2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '70%',
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bankNameCol: {
    gap: 2,
  },
  bankNameText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardTitleText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E9BB0',
    letterSpacing: 0.8,
  },
  nfcContainer: {
    width: 22,
    height: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  nfcWave1: {
    width: 2,
    height: 8,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  nfcWave2: {
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  nfcWave3: {
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emvChip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#D4AF37', // 24K Gold tone
    borderWidth: 1,
    borderColor: '#997314',
    position: 'relative',
    overflow: 'hidden',
  },
  chipLineH: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#7A5C0E',
  },
  chipLineV1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '32%',
    width: 1,
    backgroundColor: '#7A5C0E',
  },
  chipLineV2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: '32%',
    width: 1,
    backgroundColor: '#7A5C0E',
  },
  chipCenterPad: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 10,
    right: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#7A5C0E',
  },
  balanceBadge: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  balanceLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.8,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00E676',
  },
  balanceCredit: {
    color: '#FFB800',
  },
  numberRow: {
    paddingVertical: 2,
  },
  embossedNumber: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2.2,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1.5 },
    textShadowRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  holderCol: {
    gap: 1,
  },
  holderLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.8,
  },
  holderName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  expiryCol: {
    gap: 1,
  },
  expiryLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.8,
  },
  expiryDate: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mastercardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 36,
    height: 22,
    position: 'relative',
  },
  mcCircleRed: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EB001B',
    position: 'absolute',
    left: 0,
  },
  mcCircleAmber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F79E1B',
    position: 'absolute',
    right: 0,
    opacity: 0.9,
  },
  visaPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  visaText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  dragHintText: {
    fontSize: 10,
    color: '#65738E',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
