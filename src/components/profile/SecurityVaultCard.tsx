import React from 'react';
import { StyleSheet, Text, View, Pressable, Switch } from 'react-native';
import { SecuritySettings } from '@/domain/profile/types';

interface SecurityVaultCardProps {
  security: SecuritySettings;
  onToggleBiometric: () => void;
  onTogglePrivacyCurtain: () => void;
  onSetAutoLock: (duration: 'immediate' | '1m' | '5m') => void;
  onOpenNotifications?: () => void;
}

export function SecurityVaultCard({
  security,
  onToggleBiometric,
  onTogglePrivacyCurtain,
  onSetAutoLock,
  onOpenNotifications,
}: SecurityVaultCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithPulse}>
          <View style={styles.pulseDot} />
          <Text style={styles.sectionTitle}>SECURITY & VAULT PRIVACY</Text>
        </View>
        <Text style={styles.vaultActiveText}>HARDWARE ENCRYPTED</Text>
      </View>

      <View style={styles.settingsList}>
        {/* Toggle 1: Biometric Lock */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🛡️</Text>
            <View>
              <Text style={styles.settingLabel}>BIOMETRIC APP LOCK</Text>
              <Text style={styles.settingSub}>Require FaceID or Fingerprint</Text>
            </View>
          </View>
          <Switch
            value={security.biometricLockEnabled}
            onValueChange={onToggleBiometric}
            trackColor={{ false: '#161B26', true: 'rgba(0, 230, 118, 0.4)' }}
            thumbColor={security.biometricLockEnabled ? '#00E676' : '#65738E'}
          />
        </View>

        <View style={styles.divider} />

        {/* Toggle 2: Privacy Shield Curtain */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>👁️</Text>
            <View>
              <Text style={styles.settingLabel}>APP SWITCHER SHIELD</Text>
              <Text style={styles.settingSub}>Blur balances in background apps</Text>
            </View>
          </View>
          <Switch
            value={security.privacyCurtainEnabled}
            onValueChange={onTogglePrivacyCurtain}
            trackColor={{ false: '#161B26', true: 'rgba(0, 240, 255, 0.4)' }}
            thumbColor={security.privacyCurtainEnabled ? '#00F0FF' : '#65738E'}
          />
        </View>

        <View style={styles.divider} />

        {/* Setting 3: Auto-Lock Duration */}
        <View style={styles.settingCol}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>⏱️</Text>
            <View>
              <Text style={styles.settingLabel}>AUTO-LOCK INTERVAL</Text>
              <Text style={styles.settingSub}>Lock vault after inactivity</Text>
            </View>
          </View>

          <View style={styles.durationSelector}>
            {(['immediate', '1m', '5m'] as const).map((dur) => {
              const isSelected = security.autoLockDuration === dur;
              const label = dur === 'immediate' ? 'Immediate' : dur === '1m' ? '1 Min' : '5 Mins';
              return (
                <Pressable
                  key={dur}
                  onPress={() => onSetAutoLock(dur)}
                  style={[
                    styles.durPill,
                    isSelected && styles.durPillSelected,
                  ]}>
                  <Text
                    style={[
                      styles.durText,
                      isSelected && styles.durTextSelected,
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Setting 4: Native EMI Push Notifications */}
        <Pressable
          onPress={onOpenNotifications}
          style={({ pressed }) => [styles.settingRow, pressed && styles.rowPressed]}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔔</Text>
            <View>
              <Text style={styles.settingLabel}>NATIVE EMI NOTIFICATIONS</Text>
              <Text style={styles.settingSub}>3-tier scheduled alarms & lockscreen alerts</Text>
            </View>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      {/* Hardware Encryption Seal */}
      <View style={styles.sealBox}>
        <Text style={styles.sealText}>
          🔒 AES-256-GCM LOCAL HARDWARE ENCRYPTION • 0 BYTES CLOUD
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D111A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  titleWithPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  vaultActiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 0.6,
  },
  settingsList: {
    backgroundColor: '#07090E',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingCol: {
    paddingVertical: 6,
    gap: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingIcon: {
    fontSize: 18,
  },
  settingLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.6,
  },
  settingSub: {
    fontSize: 9,
    color: '#65738E',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 4,
  },
  durationSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 28,
  },
  durPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  durPillSelected: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  durText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E9BB0',
  },
  durTextSelected: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  sealBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  sealText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  rowPressed: {
    opacity: 0.7,
  },
  chevron: {
    color: '#00F0FF',
    fontSize: 18,
    fontWeight: '700',
  },
});
