import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IncomeVideoReaction } from '@/components/transaction/IncomeVideoReaction';

interface TeslaVault3DProps {
  size?: number;
}

export function TeslaVault3D({ size = 220 }: TeslaVault3DProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <IncomeVideoReaction size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
