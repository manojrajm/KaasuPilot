import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useProfile } from '@/hooks/useProfile';
import { PilotIdentityCard } from '@/components/profile/PilotIdentityCard';
import { RealTime3DCard } from '@/components/profile/RealTime3DCard';
import { FinancialTelemetryCard } from '@/components/profile/FinancialTelemetryCard';
import { SecurityVaultCard } from '@/components/profile/SecurityVaultCard';
import { DataSovereigntyCard } from '@/components/profile/DataSovereigntyCard';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { TeslaHudModal } from '@/components/ui/TeslaHudModal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { ConnectedCard } from '@/domain/profile/types';

export default function ProfileScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();

  const {
    profile,
    security,
    experience,
    cards,
    updateProfile,
    toggleBiometric,
    togglePrivacyCurtain,
    setAutoLockDuration,
    toggleHaptics,
    toggleVideoReactions,
    toggleThreeVault,
    exportBackup,
    exportCsv,
    factoryReset,
  } = useProfile();

  // Active 3D Card Selection index
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const activeCard: ConnectedCard = cards[selectedCardIndex] || cards[0];

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [hudModal, setHudModal] = useState<{
    visible: boolean;
    title: string;
    subtitle?: string;
    icon?: string;
    badge?: string;
    accentColor?: string;
  }>({
    visible: false,
    title: '',
  });

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleExportBackup = async () => {
    const backupJson = await exportBackup();
    setHudModal({
      visible: true,
      title: 'Local Vault Backup Ready',
      subtitle: `Successfully exported encrypted snapshot (${backupJson.length} bytes). Stored strictly on device storage.`,
      icon: '📦',
      badge: 'ENCRYPTED BACKUP GENERATED',
      accentColor: '#FFB800',
    });
  };

  const handleExportCsv = async () => {
    const csvData = await exportCsv();
    const rows = csvData.split('\n').length - 2;
    setHudModal({
      visible: true,
      title: 'CSV Audit Spreadsheet Generated',
      subtitle: `Exported ${Math.max(0, rows)} ledger transaction records for accountant audit.`,
      icon: '📊',
      badge: 'SPREADSHEET COMPILED',
      accentColor: '#00F0FF',
    });
  };

  const handleFactoryReset = async () => {
    await factoryReset();
    setHudModal({
      visible: true,
      title: 'Local Vault Reset Complete',
      subtitle: 'All application caches and settings have been restored to initial state.',
      icon: '🗑️',
      badge: 'VAULT RESET FINISHED',
      accentColor: '#FF3B30',
    });
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(safeAreaInsets.top, Spacing.three),
            paddingBottom: safeAreaInsets.bottom + BottomTabInset + Spacing.six + 48,
          },
        ]}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        bounces={true}>
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}>
          {/* 1. Header Bar */}
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.headerTitle}>PROFILE & VAULT</Text>
              <View style={styles.localVaultRow}>
                <View style={styles.greenPulse} />
                <Text style={styles.localVaultText}>
                  HARDWARE SECURED • 100% PRIVATE
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.push('/')}
              style={styles.homeBackBtn}
              hitSlop={8}>
              <Text style={styles.homeBackText}>‹ Dashboard</Text>
            </Pressable>
          </View>

          {/* 2. Pilot Identity & Callsign Card */}
          <PilotIdentityCard
            profile={profile}
            onEdit={() => setShowEditModal(true)}
          />

          {/* 3. Real-Time 3D Interactive Metallic Bank Cards */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>CONNECTED 3D ACCOUNTS</Text>
              <Text style={styles.sectionCountText}>
                {cards.length} Payment Cards
              </Text>
            </View>

            {/* Render 3D Card */}
            {activeCard ? <RealTime3DCard card={activeCard} /> : null}

            {/* Interactive Card Selection Chips */}
            <View style={styles.cardSelectorRow}>
              {cards.map((c, idx) => {
                const isSelected = idx === selectedCardIndex;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSelectedCardIndex(idx)}
                    style={[
                      styles.cardChip,
                      isSelected && {
                        borderColor: c.accentGlow,
                        backgroundColor: `${c.accentGlow}18`,
                      },
                    ]}>
                    <View
                      style={[
                        styles.chipDot,
                        { backgroundColor: c.accentGlow },
                      ]}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && { color: c.accentGlow, fontWeight: '800' },
                      ]}>
                      {c.bankName} (••{c.accountNumberMasked.slice(-4)})
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. Financial Telemetry Parameters */}
          <FinancialTelemetryCard
            profile={profile}
            onEdit={() => setShowEditModal(true)}
          />

          {/* 5. Biometric & Vault Privacy */}
          <SecurityVaultCard
            security={security}
            onToggleBiometric={toggleBiometric}
            onTogglePrivacyCurtain={togglePrivacyCurtain}
            onSetAutoLock={setAutoLockDuration}
          />

          {/* 6. Cockpit Experience & Audio-Haptic Feedback */}
          <View style={styles.experienceCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>COCKPIT EXPERIENCE</Text>
              <Text style={styles.experienceSubBadge}>FEEDBACK & GRAPHICS</Text>
            </View>

            <View style={styles.expSettingsList}>
              {/* Toggle: Motor Haptics */}
              <View style={styles.expRow}>
                <View style={styles.expLeft}>
                  <Text style={styles.expIcon}>⚡</Text>
                  <View>
                    <Text style={styles.expLabel}>TESLA MOTOR HAPTICS</Text>
                    <Text style={styles.expSub}>Tactile feedback on taps & saves</Text>
                  </View>
                </View>
                <Switch
                  value={experience.hapticsEnabled}
                  onValueChange={toggleHaptics}
                  trackColor={{ false: '#161B26', true: 'rgba(255, 215, 0, 0.4)' }}
                  thumbColor={experience.hapticsEnabled ? '#FFD700' : '#65738E'}
                />
              </View>

              <View style={styles.expDivider} />

              {/* Toggle: Video Emotion Reactions */}
              <View style={styles.expRow}>
                <View style={styles.expLeft}>
                  <Text style={styles.expIcon}>🎬</Text>
                  <View>
                    <Text style={styles.expLabel}>VIDEO EMOTION REACTIONS</Text>
                    <Text style={styles.expSub}>Play MP4 animations on income & expense</Text>
                  </View>
                </View>
                <Switch
                  value={experience.videoReactionsEnabled}
                  onValueChange={toggleVideoReactions}
                  trackColor={{ false: '#161B26', true: 'rgba(0, 230, 118, 0.4)' }}
                  thumbColor={experience.videoReactionsEnabled ? '#00E676' : '#65738E'}
                />
              </View>

              <View style={styles.expDivider} />

              {/* Toggle: Three.js 3D Vault */}
              <View style={styles.expRow}>
                <View style={styles.expLeft}>
                  <Text style={styles.expIcon}>🧊</Text>
                  <View>
                    <Text style={styles.expLabel}>3D THREE.JS VAULT ENGINE</Text>
                    <Text style={styles.expSub}>Real-time WebGL photon particles</Text>
                  </View>
                </View>
                <Switch
                  value={experience.threeVaultEnabled}
                  onValueChange={toggleThreeVault}
                  trackColor={{ false: '#161B26', true: 'rgba(0, 240, 255, 0.4)' }}
                  thumbColor={experience.threeVaultEnabled ? '#00F0FF' : '#65738E'}
                />
              </View>
            </View>
          </View>

          {/* 7. Data Sovereignty & Export */}
          <DataSovereigntyCard
            onExportBackup={handleExportBackup}
            onExportCsv={handleExportCsv}
            onFactoryReset={handleFactoryReset}
          />

          {/* System Telemetry Footer */}
          <View style={styles.footerSeal}>
            <Text style={styles.footerVersion}>
              KASUPILOT • v2.4.0 (TESLA CYBER EDITION)
            </Text>
            <Text style={styles.footerSub}>
              100% LOCAL VAULT • ZERO TRACKING • AES-256 ENCRYPTED
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit Profile Telemetry Modal */}
      <EditProfileModal
        visible={showEditModal}
        profile={profile}
        onClose={() => setShowEditModal(false)}
        onSave={(patch) => {
          updateProfile(patch);
          setHudModal({
            visible: true,
            title: 'Profile Telemetry Updated',
            subtitle: 'Changes saved locally to your device encryption storage.',
            icon: '✓',
            badge: 'LOCAL STATE SYNCHRONIZED',
            accentColor: '#00E676',
          });
        }}
      />

      {/* Tesla HUD System Notification Modal */}
      <TeslaHudModal
        visible={hudModal.visible}
        title={hudModal.title}
        subtitle={hudModal.subtitle}
        icon={hudModal.icon}
        badge={hudModal.badge}
        accentColor={hudModal.accentColor}
        onClose={() => setHudModal((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#07090E',
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
    gap: Spacing.three,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  localVaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  localVaultText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  homeBackBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  homeBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  cardSection: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  sectionCountText: {
    fontSize: 10.5,
    color: '#FFB800',
    fontWeight: '700',
  },
  cardSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  cardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#8E9BB0',
  },
  experienceCard: {
    backgroundColor: '#0D111A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  experienceSubBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.6,
  },
  expSettingsList: {
    backgroundColor: '#07090E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  expRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  expLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  expIcon: {
    fontSize: 18,
  },
  expLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.6,
  },
  expSub: {
    fontSize: 9,
    color: '#65738E',
    marginTop: 1,
  },
  expDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 4,
  },
  footerSeal: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  footerVersion: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  footerSub: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#4B5569',
    letterSpacing: 0.8,
  },
});
