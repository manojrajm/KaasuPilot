import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

interface QuickActionDockProps {
  onPressAddManual?: () => void;
  onPressVoice?: () => void;
  onPressScan?: () => void;
  onPressReplayVideo?: () => void;
}

export function QuickActionDock({
  onPressAddManual,
  onPressVoice,
  onPressScan,
  onPressReplayVideo,
}: QuickActionDockProps) {
  return (
    <View style={styles.dockContainer}>
      <Pressable onPress={onPressAddManual} style={styles.actionBtn}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>➕</Text>
        </View>
        <Text style={styles.actionLabel}>Add Txn</Text>
      </Pressable>

      <Pressable onPress={onPressVoice} style={styles.actionBtn}>
        <View style={[styles.iconCircle, styles.voiceCircle]}>
          <Text style={styles.iconText}>🎙️</Text>
        </View>
        <Text style={[styles.actionLabel, { color: '#00F0FF' }]}>Voice NLU</Text>
      </Pressable>

      <Pressable onPress={onPressScan} style={styles.actionBtn}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>📷</Text>
        </View>
        <Text style={styles.actionLabel}>Scan OCR</Text>
      </Pressable>

      <Pressable onPress={onPressReplayVideo} style={styles.actionBtn}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>▶</Text>
        </View>
        <Text style={styles.actionLabel}>Replay KP</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F131C',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceCircle: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  iconText: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#8E9BB0',
    letterSpacing: 0.3,
  },
});
