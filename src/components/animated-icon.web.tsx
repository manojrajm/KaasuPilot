import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

export { VideoSplashOverlay as AnimatedSplashOverlay } from './video-splash';

const DURATION = 500;

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 0.7 }],
    opacity: 0,
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.out(Easing.back(1.4)),
  },
});

export function AnimatedIcon({ size = 120 }: { size?: number }) {
  const borderRadius = Math.round(size * 0.24);

  return (
    <View style={[styles.iconContainer, { width: size + 20, height: size + 20 }]}>
      <Animated.View
        style={[styles.glow, { width: size * 1.5, height: size * 1.5 }]}>
        <Image
          style={{ width: '100%', height: '100%' }}
          source={require('@/assets/images/logo-glow.png')}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.View
        entering={logoKeyframe.duration(DURATION)}
        style={[
          styles.logoCard,
          {
            width: size,
            height: size,
            borderRadius,
          },
        ]}>
        <Image
          style={styles.logoImage}
          source={require('@/assets/images/KPLogo.png')}
          contentFit="cover"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  glow: {
    position: 'absolute',
    opacity: 0.4,
  },
  logoCard: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
});
