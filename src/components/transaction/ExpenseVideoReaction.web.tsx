import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface ExpenseVideoReactionProps {
  size?: number;
}

export function ExpenseVideoReaction({ size = 180 }: ExpenseVideoReactionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const rawAsset = require('@/assets/images/reactions/sad_expense.mp4');
  const resolved = Image.resolveAssetSource(rawAsset);
  const videoSrc =
    resolved?.uri ?? (typeof rawAsset === 'string' ? rawAsset : rawAsset?.default);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.log('Expense video autoplay deferred:', err);
      });
    }
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: size,
          height: size,
          borderRadius: 22,
          objectFit: 'cover',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
