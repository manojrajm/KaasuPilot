import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { UserProfile } from '@/domain/profile/types';

interface PilotIdentityCardProps {
  profile: UserProfile;
  onEdit: () => void;
  onPressAvatar?: () => void;
}

export function PilotIdentityCard({ profile, onEdit, onPressAvatar }: PilotIdentityCardProps) {
  const initials = profile.name
    ? profile.name
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : '⚡';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        {/* 3D Gold Halo Biometric Avatar */}
        <Pressable
          onPress={onPressAvatar}
          disabled={!onPressAvatar}
          style={({ pressed }) => [styles.avatarHaloRing, pressed && styles.avatarPressed]}>
          <View style={styles.avatarInnerCircle}>
            {profile.photoUri ? (
              <Image
                source={{ uri: profile.photoUri }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Text style={styles.avatarEmoji}>{initials}</Text>
            )}
          </View>
          {onPressAvatar ? (
            <View style={styles.cameraPill}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.identityMeta}>
          <Text style={styles.pilotName}>{profile.name || 'Anonymous Pilot'}</Text>

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
    width: 68,
    height: 68,
    borderRadius: 34,
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
    position: 'relative',
  },
  avatarPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  avatarInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#07090E',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFD700',
  },
  cameraPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#07090E',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 10,
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
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  tierDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8A96AD',
    letterSpacing: 0.8,
  },
  editBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
});