import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';

interface IncomeVideoReactionProps {
  size?: number;
}

export function IncomeVideoReaction({ size = 180 }: IncomeVideoReactionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const rawAsset = require('@/assets/images/reactions/happy_income.mp4');
  const resolved = Image.resolveAssetSource(rawAsset);
  const videoSrc =
    resolved?.uri ?? (typeof rawAsset === 'string' ? rawAsset : rawAsset?.default);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.log('Video autoplay deferred:', err);
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
