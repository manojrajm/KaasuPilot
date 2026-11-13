import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VideoSplashOverlay } from '@/components/video-splash';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const [showVideoModal, setShowVideoModal] = useState(false);

  return (
    <ThemedView style={styles.screenContainer}>
      {showVideoModal && (
        <VideoSplashOverlay onFinish={() => setShowVideoModal(false)} />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(safeAreaInsets.top, Spacing.four),
            paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          {/* Hero Section with KpLogo */}
          <View style={styles.heroSection}>
            <AnimatedIcon size={130} />

            <View style={styles.badgeContainer}>
              <ThemedText type="code" style={styles.badgeText}>
                WELCOME TO
              </ThemedText>
            </View>

            <ThemedText type="title" style={styles.appTitle}>
              KasuPilot
            </ThemedText>

            <ThemedText type="default" style={styles.tagline}>
              Your Smart Financial Co-Pilot
            </ThemedText>

            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              Track expenses effortlessly, set smart budgets, and navigate your journey to financial
              freedom.
            </ThemedText>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsSection}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push('/explore')}>
              <ThemedText style={styles.primaryButtonText}>Get Started →</ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.backgroundSelected },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setShowVideoModal(true)}>
              <ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>
                ▶ Replay Intro Video
              </ThemedText>
            </Pressable>
          </View>

          {/* Core Feature Highlights */}
          <View style={styles.featuresSection}>
            <ThemedView type="backgroundElement" style={styles.featureCard}>
              <ThemedText style={styles.featureIcon}>💳</ThemedText>
              <View style={styles.featureTextWrapper}>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  Smart Expense Tracking
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Log transactions and monitor your cash flow in real-time.
                </ThemedText>
              </View>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.featureCard}>
              <ThemedText style={styles.featureIcon}>🎯</ThemedText>
              <View style={styles.featureTextWrapper}>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  Budget Navigator
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Set dynamic limits and keep every rupee or dollar on track.
                </ThemedText>
              </View>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.featureCard}>
              <ThemedText style={styles.featureIcon}>📈</ThemedText>
              <View style={styles.featureTextWrapper}>
                <ThemedText type="smallBold" style={styles.featureTitle}>
                  Insightful Analytics
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Visual breakdowns to make confident financial decisions.
                </ThemedText>
              </View>
            </ThemedView>
          </View>

          {/* Footer Info */}
          <View style={styles.footerSection}>
            <ThemedText type="code" themeColor="textSecondary" style={styles.versionText}>
              KASUPILOT • v1.0.0
            </ThemedText>
            {Platform.OS === 'web' && <WebBadge />}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    gap: Spacing.four,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    width: '100%',
  },
  badgeContainer: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: 12,
    backgroundColor: 'rgba(32, 138, 239, 0.15)',
  },
  badgeText: {
    color: '#208AEF',
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 11,
  },
  appTitle: {
    fontSize: 40,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#208AEF',
  },
  description: {
    textAlign: 'center',
    maxWidth: 420,
    marginTop: Spacing.one,
    lineHeight: 22,
  },
  actionsSection: {
    width: '100%',
    maxWidth: 360,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  primaryButton: {
    backgroundColor: '#208AEF',
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.four,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  featuresSection: {
    width: '100%',
    maxWidth: 500,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.three,
  },
  featureIcon: {
    fontSize: 26,
  },
  featureTextWrapper: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    fontSize: 15,
  },
  footerSection: {
    marginTop: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  versionText: {
    fontSize: 11,
    letterSpacing: 1,
  },
});
