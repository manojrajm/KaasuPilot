import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';

interface Category3DIconProps {
  emoji: string;
  color: string;
  gradientColors?: [string, string];
  size?: number;
  selected?: boolean;
}

export function Category3DIcon({
  emoji,
  color,
  gradientColors,
  size = 46,
  selected = false,
}: Category3DIconProps) {
  const borderRadius = Math.round(size * 0.34);
  const primaryColor = gradientColors?.[0] || color;

  return (
    <View
      style={[
        styles.iconContainer,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: primaryColor,
          borderColor: selected ? '#FFB800' : 'rgba(255, 255, 255, 0.25)',
          borderWidth: selected ? 2.5 : 1,
          shadowColor: primaryColor,
        },
      ]}>
      {/* 3D Specular Highlight (Simulating overhead glass reflection) */}
      <View
        style={[
          styles.specularShine,
          {
            width: size * 0.7,
            height: size * 0.35,
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius,
          },
        ]}
      />

      {/* 3D Deep Ground Shadow */}
      <View
        style={[
          styles.bottomDepthShadow,
          {
            width: size,
            height: size * 0.4,
            borderBottomLeftRadius: borderRadius,
            borderBottomRightRadius: borderRadius,
          },
        ]}
      />

      {/* Central Action Glyph */}
      <Text
        style={[
          styles.emojiText,
          {
            fontSize: Math.round(size * 0.52),
          },
        ]}>
        {emoji}
      </Text>

      {/* Selected Halo Ring */}
      {selected ? (
        <View
          style={[
            styles.selectionRing,
            {
              borderRadius: borderRadius + 4,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  specularShine: {
    position: 'absolute',
    top: 0,
    left: '15%',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  bottomDepthShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  emojiText: {
    zIndex: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  selectionRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: '#FFB800',
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
  },
});
