import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface IndianCurrencyBgProps {
  opacity?: number;
}

export function IndianCurrencyBg({ opacity = 0.15 }: IndianCurrencyBgProps) {
  return (
    <View style={[styles.container, { opacity }]} pointerEvents="none">
      {/* Decorative Guilloche Currency Arcs */}
      <View style={styles.guillocheWaveOne} />
      <View style={styles.guillocheWaveTwo} />

      {/* Floating Embossed ₹ 20 Bi-Metallic Coin */}
      <View style={styles.coinOuterRing}>
        <View style={styles.coinInnerCore}>
          <Text style={styles.coinRupeeSymbol}>₹</Text>
          <Text style={styles.coinValueText}>20</Text>
        </View>
      </View>

      {/* Floating ₹ 10 Coin Watermark */}
      <View style={styles.smallCoinOuterRing}>
        <View style={styles.smallCoinInnerCore}>
          <Text style={styles.smallCoinRupeeSymbol}>₹</Text>
          <Text style={styles.smallCoinValueText}>10</Text>
        </View>
      </View>

      {/* Reserve Bank / Currency Watermark Badge */}
      <View style={styles.noteStampBorder}>
        <Text style={styles.noteStampText}>BHARAT • INDIA</Text>
        <Text style={styles.noteMicroText}>सत्यमेव जयते</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guillocheWaveOne: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 184, 0, 0.4)',
    borderStyle: 'dashed',
  },
  guillocheWaveTwo: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  coinOuterRing: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3.5,
    borderColor: '#D4AF37', // Indian coin brass ring
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinInnerCore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#C0C0C0', // Silver center
    backgroundColor: 'rgba(192, 192, 192, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinRupeeSymbol: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D4AF37',
    lineHeight: 18,
  },
  coinValueText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D4AF37',
    lineHeight: 11,
  },
  smallCoinOuterRing: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    borderColor: '#D4AF37',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCoinInnerCore: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#C0C0C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCoinRupeeSymbol: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D4AF37',
    lineHeight: 14,
  },
  smallCoinValueText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#D4AF37',
    lineHeight: 9,
  },
  noteStampBorder: {
    position: 'absolute',
    bottom: 8,
    right: 20,
    borderWidth: 0.8,
    borderColor: 'rgba(255, 184, 0, 0.4)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  noteStampText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 1.2,
  },
  noteMicroText: {
    fontSize: 6.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 0.5,
  },
});
