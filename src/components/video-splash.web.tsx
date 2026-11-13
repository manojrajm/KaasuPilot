import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';

export interface VideoSplashOverlayProps {
  onFinish?: () => void;
}

export function VideoSplashOverlay({ onFinish }: VideoSplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [muted, setMuted] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasFinishedRef = useRef(false);

  // Resolve asset source across web bundlers
  const rawAsset = require('@/assets/images/KP.mp4');
  const resolved = Image.resolveAssetSource(rawAsset);
  const videoSrc = resolved?.uri ?? (typeof rawAsset === 'string' ? rawAsset : rawAsset?.default);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onFinish?.();
    });
  }, [fadeAnim, onFinish]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    if (videoRef.current) {
      videoRef.current.play().catch((err) => {
        console.log('Video autoplay deferred:', err);
      });
    }

    // Safety fallback timeout
    const timeout = setTimeout(() => {
      handleFinish();
    }, 12000);

    return () => clearTimeout(timeout);
  }, [handleFinish]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        playsInline
        muted={muted}
        onEnded={handleFinish}
        onError={() => {
          console.warn('Web video load fallback triggered');
          handleFinish();
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000000',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'row',
          gap: 10,
          zIndex: 100000,
        }}>
        <button
          onClick={() => setMuted((prev) => !prev)}
          type="button"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '20px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
          {muted ? '🔇 Unmute' : '🔊 Mute'}
        </button>

        <button
          onClick={handleFinish}
          type="button"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '20px',
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            outline: 'none',
            letterSpacing: '0.5px',
          }}>
          Skip ›
        </button>
      </div>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
