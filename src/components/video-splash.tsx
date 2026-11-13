import { useVideoPlayer, VideoView } from 'expo-video';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface VideoSplashOverlayProps {
  onFinish?: () => void;
}

export function VideoSplashOverlay({ onFinish }: VideoSplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const hasFinishedRef = useRef(false);

  const videoSource = require('@/assets/images/KP.mp4');

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.muted = false;
    p.play();
  });

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    try {
      player.pause();
    } catch {
      // player might already be finished
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onFinish?.();
    });
  }, [fadeAnim, onFinish, player]);

  useEffect(() => {
    // Hide native OS splash screen once custom video splash is mounted
    SplashScreen.hideAsync().catch(() => {});

    // Listen to video completion
    const endSub = player.addListener('playToEnd', () => {
      handleFinish();
    });

    // Handle any playback errors gracefully
    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error') {
        console.warn('Video splash status error:', error);
        handleFinish();
      }
    });

    // Fallback safety timeout (video is 10s)
    const timeout = setTimeout(() => {
      handleFinish();
    }, 12000);

    return () => {
      endSub.remove();
      statusSub.remove();
      clearTimeout(timeout);
    };
  }, [player, handleFinish]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
      />
      <Pressable
        style={[styles.skipButton, { top: Math.max(insets.top + 16, 40) }]}
        onPress={handleFinish}
        accessibilityRole="button"
        accessibilityLabel="Skip intro video">
        <Text style={styles.skipText}>Skip ›</Text>
      </Pressable>
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
  skipButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
