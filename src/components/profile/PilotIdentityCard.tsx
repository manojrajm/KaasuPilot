import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { UserProfile } from '@/domain/profile/types';

interface PilotIdentityCardProps {
  profile: UserProfile;
  onEdit: () => void;
}

export function PilotIdentityCard({ profile, onEdit }: PilotIdentityCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* 3D Gold Halo Biometric Avatar */}
        <View style={styles.avatarHaloRing}>
          <View style={styles.avatarInnerCircle}>
            <Text style={styles.avatarEmoji}>⚡</Text>
          </View>
        </View>

        <View style={styles.identityMeta}>
          <Text style={styles.pilotName}>{profile.name}</Text>
          <Text style={styles.pilotCallsign}>// {profile.callSign}</Text>

          <View style={styles.tierBadge}>
            <View style={styles.tierDot} />
            <Text style={styles.tierText}>{profile.tier}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={onEdit}
        style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}>
        <Text style={styles.editBtnText}>✏️ Edit Profile Telemetry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D111A',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 14,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarHaloRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#07090E',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  identityMeta: {
    flex: 1,
    gap: 3,
  },
  pilotName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  pilotCallsign: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFB800',
    letterSpacing: 0.5,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  tierDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
  tierText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.6,
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
