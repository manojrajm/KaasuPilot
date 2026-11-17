import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BankCard } from '@/components/cards/BankCard';
import { cardPropsFromAccount } from '@/components/cards/cardProps';
import { ColdVaultModal } from '@/components/profile/ColdVaultModal';
import { DataSovereigntyCard } from '@/components/profile/DataSovereigntyCard';
import { DeveloperCreditCard } from '@/components/profile/DeveloperCreditCard';
import { DeveloperDossierModal } from '@/components/profile/DeveloperDossierModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { FinancialTelemetryCard } from '@/components/profile/FinancialTelemetryCard';
import { MonthlyReportAuditCard } from '@/components/profile/MonthlyReportAuditCard';
import { NotificationSettingsModal } from '@/components/profile/NotificationSettingsModal';
import { PilotIdentityCard } from '@/components/profile/PilotIdentityCard';
import { SecurityVaultCard } from '@/components/profile/SecurityVaultCard';
import { useAppLock } from '@/components/security/LockProvider';
import { TeslaHudModal } from '@/components/ui/TeslaHudModal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAccounts } from '@/hooks/useAccounts';
import { useProfile } from '@/hooks/useProfile';
import { profilePhotoService } from '@/services/profilePhoto';

export default function ProfileScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const { setupPin } = useAppLock();
  const { accounts, byId: accountsById } = useAccounts();

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

  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [vaultModal, setVaultModal] = useState<{
    visible: boolean;
    mode: 'export' | 'restore';
  }>({
    visible: false,
    mode: 'export',
  });
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

  const handlePressAvatar = () => {
    Alert.alert('Pilot Avatar', 'Update your personal profile photo', [
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          await profilePhotoService.pickFromGallery();
        },
      },
      {
        text: 'Take Photo',
        onPress: async () => {
          await profilePhotoService.takePhoto();
        },
      },
      ...(profile.photoUri
        ? [
            {
              text: 'Remove Photo',
              style: 'destructive' as const,
              onPress: async () => {
                await profilePhotoService.removePhoto();
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

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

  const salaryAccount = profile.salaryAccountId ? accountsById[profile.salaryAccountId] : undefined;

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
            </View>

            <Pressable
              onPress={() => router.push('/')}
              style={styles.homeBackBtn}
              hitSlop={8}>
              <Text style={styles.homeBackText}>‹ Home</Text>
            </Pressable>
          </View>

          {/* 2. Pilot Identity & Callsign Card */}
          <PilotIdentityCard
            profile={profile}
            onEdit={() => setShowEditModal(true)}
            onPressAvatar={handlePressAvatar}
          />

          {/* 3. Connected Payment Cards Carousel */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>CONNECTED ACCOUNTS & CARDS</Text>
              <Pressable onPress={() => router.push('/cards/index')} hitSlop={8}>
                <Text style={styles.manageCardsText}>Manage ({cards.length}) ›</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalCardsScroll}>
              {cards.map((c) => (
                <View key={c.id} style={styles.cardWrapper}>
                  <BankCard
                    {...cardPropsFromAccount(c)}
                    width={280}
                    onPress={() => router.push({ pathname: '/cards/[id]', params: { id: c.id } })}
                  />
                </View>
              ))}

              <Pressable
                onPress={() => router.push('/cards/new')}
                style={styles.addCardTile}>
                <Text style={styles.addCardIcon}>＋</Text>
                <Text style={styles.addCardText}>Add Card</Text>
                <Text style={styles.addCardSub}>Debit or Credit</Text>
              </Pressable>
            </ScrollView>
          </View>

          {/* 4. Financial Telemetry Parameters */}
          <FinancialTelemetryCard
            profile={profile}
            salaryAccountName={salaryAccount?.name}
            onEdit={() => setShowEditModal(true)}
          />

          {/* 5. Biometric & Vault Privacy */}
          <SecurityVaultCard
            security={security}
            onToggleBiometric={() => toggleBiometric(setupPin)}
            onTogglePrivacyCurtain={togglePrivacyCurtain}
            onSetAutoLock={setAutoLockDuration}
            onOpenNotifications={() => setShowNotificationModal(true)}
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
                    <Text style={styles.expLabel}>CYBER MOTOR HAPTICS</Text>
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
                    <Text style={styles.expLabel}>3D VAULT ENGINE</Text>
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

          {/* 7. Monthly Excel Reports & Instant Vault Backup */}
          <MonthlyReportAuditCard
            onOpenInstantBackup={() => setVaultModal({ visible: true, mode: 'export' })}
          />

          {/* 8. Data Sovereignty & Export */}
          <DataSovereigntyCard
            onExportBackup={() => setVaultModal({ visible: true, mode: 'export' })}
            onRestoreBackup={() => setVaultModal({ visible: true, mode: 'restore' })}
            onExportCsv={handleExportCsv}
            onFactoryReset={handleFactoryReset}
          />

          {/* 9. Lead Architect Credit Card */}
          <DeveloperCreditCard
            developerName="Manoj Raj"
            role="Lead Architect"
            onPress={() => setShowDeveloperModal(true)}
          />

          {/* System Telemetry Footer */}
          <View style={styles.footerSeal}>
            <Text style={styles.footerVersion}>
              KASUPILOT • v2.4.0 (CYBER COCKPIT EDITION)
            </Text>
            <Text style={styles.footerSub}>
              100% LOCAL VAULT • ZERO TRACKING • HARDWARE ENCRYPTED
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

      {/* HUD System Notification Modal */}
      <TeslaHudModal
        visible={hudModal.visible}
        title={hudModal.title}
        subtitle={hudModal.subtitle}
        icon={hudModal.icon}
        badge={hudModal.badge}
        accentColor={hudModal.accentColor}
        onClose={() => setHudModal((prev) => ({ ...prev, visible: false }))}
      />

      {/* Cold Vault Export & Restore Modal */}
      <ColdVaultModal
        visible={vaultModal.visible}
        initialMode={vaultModal.mode}
        onClose={() => setVaultModal((prev) => ({ ...prev, visible: false }))}
        onRestoreSuccess={(summary) => {
          setHudModal({
            visible: true,
            title: 'Cold Vault Restored',
            subtitle: summary,
            icon: '✓',
            badge: 'LEDGER RECONCILIATION COMPLETE',
            accentColor: '#00E676',
          });
        }}
      />

      {/* Native Push Notifications Telemetry & Reminders */}
      <NotificationSettingsModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Developer Profile Dossier & Sponsor Modal */}
      <DeveloperDossierModal
        visible={showDeveloperModal}
        onClose={() => setShowDeveloperModal(false)}
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
  manageCardsText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00F0FF',
  },
  horizontalCardsScroll: {
    paddingVertical: 4,
    gap: 12,
    alignItems: 'center',
  },
  cardWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  addCardTile: {
    width: 140,
    height: 280 / 1.586,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 240, 255, 0.35)',
    backgroundColor: 'rgba(0, 240, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  addCardIcon: {
    fontSize: 26,
    color: '#00F0FF',
    fontWeight: '800',
  },
  addCardText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addCardSub: {
    fontSize: 10,
    color: '#8A96AD',
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