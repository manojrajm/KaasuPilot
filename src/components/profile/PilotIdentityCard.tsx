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
      {/* Left Column: Prominent Large VIP Photo */}
      <Pressable
        onPress={onPressAvatar}
        disabled={!onPressAvatar}
        style={({ pressed }) => [styles.avatarContainer, pressed && styles.avatarPressed]}>
        <View style={styles.avatarHaloRing}>
          <View style={styles.avatarInner}>
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
        </View>

        {onPressAvatar ? (
          <View style={styles.cameraPill}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Right Column: Name, Status Badge & Inline Edit Option */}
      <View style={styles.rightInfoColumn}>
        <View style={styles.nameHeaderGroup}>
          <Text style={styles.pilotName} numberOfLines={1}>
            {profile.name || 'Anonymous Pilot'}
          </Text>

          <View style={styles.tierBadge}>
            <View style={styles.tierDot} />
            <Text style={styles.tierText}>{profile.tier}</Text>
          </View>
        </View>

        <Text style={styles.telemetrySub}>
          100% Local Vault • Hardware Encrypted
        </Text>

        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [styles.inlineEditBtn, pressed && styles.btnPressed]}>
          <Text style={styles.inlineEditBtnText}>✏️ Edit Profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D111A',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHaloRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2.5,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  avatarInner: {
    width: 82,
    height: 82,
    borderRadius: 41,
    overflow: 'hidden',
    backgroundColor: '#161B26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEmoji: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
  },
  avatarPressed: {
    transform: [{ scale: 0.96 }],
  },
  cameraPill: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0D111A',
    elevation: 3,
  },
  cameraIcon: {
    fontSize: 12,
  },
  rightInfoColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  nameHeaderGroup: {
    gap: 3,
  },
  pilotName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)',
  },
  tierDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFD700',
  },
  tierText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.8,
  },
  telemetrySub: {
    fontSize: 9.5,
    color: '#65738E',
    fontWeight: '600',
  },
  inlineEditBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    marginTop: 2,
  },
  inlineEditBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.3,
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
});
