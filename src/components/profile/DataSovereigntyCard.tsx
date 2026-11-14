import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';

interface DataSovereigntyCardProps {
  onExportBackup: () => void;
  onRestoreBackup: () => void;
  onExportCsv: () => void;
  onFactoryReset: () => void;
}

export function DataSovereigntyCard({
  onExportBackup,
  onRestoreBackup,
  onExportCsv,
  onFactoryReset,
}: DataSovereigntyCardProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleResetPress = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      return;
    }
    onFactoryReset();
    setConfirmingReset(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>DATA SOVEREIGNTY & EXPORT</Text>
        <Text style={styles.badgeText}>100% OWNERSHIP</Text>
      </View>

      <View style={styles.actionsList}>
        {/* Action 1: Export Encrypted Backup */}
        <Pressable
          onPress={onExportBackup}
          style={({ pressed }) => [styles.actionRow, pressed && styles.btnPressed]}>
          <View style={styles.actionLeft}>
            <View style={styles.iconBox}>
              <Text style={styles.iconEmoji}>📦</Text>
            </View>
            <View>
              <Text style={styles.actionTitle}>EXPORT COLD VAULT (.KASUVAULT)</Text>
              <Text style={styles.actionSub}>Save AES-256 encrypted hardware snapshot</Text>
            </View>
          </View>
          <Text style={styles.actionChevron}>›</Text>
        </Pressable>

        <View style={styles.divider} />

        {/* Action 2: Restore from .kasuvault */}
        <Pressable
          onPress={onRestoreBackup}
          style={({ pressed }) => [styles.actionRow, pressed && styles.btnPressed]}>
          <View style={styles.actionLeft}>
            <View style={[styles.iconBox, { borderColor: 'rgba(0, 230, 118, 0.3)' }]}>
              <Text style={styles.iconEmoji}>📥</Text>
            </View>
            <View>
              <Text style={[styles.actionTitle, { color: '#00E676' }]}>RESTORE FROM .KASUVAULT</Text>
              <Text style={styles.actionSub}>Import & recover complete ledger on new device</Text>
            </View>
          </View>
          <Text style={styles.actionChevron}>›</Text>
        </Pressable>

        <View style={styles.divider} />

        {/* Action 3: Export CSV */}
        <Pressable
          onPress={onExportCsv}
          style={({ pressed }) => [styles.actionRow, pressed && styles.btnPressed]}>
          <View style={styles.actionLeft}>
            <View style={styles.iconBox}>
              <Text style={styles.iconEmoji}>📊</Text>
            </View>
            <View>
              <Text style={styles.actionTitle}>EXPORT SPREADSHEET (CSV)</Text>
              <Text style={styles.actionSub}>For accountant audit & tax filings</Text>
            </View>
          </View>
          <Text style={styles.actionChevron}>›</Text>
        </Pressable>
      </View>

      {/* Danger Zone: Factory Reset Vault */}
      <View style={styles.dangerZone}>
        <Pressable
          onPress={handleResetPress}
          style={({ pressed }) => [
            styles.nukeBtn,
            confirmingReset && styles.nukeBtnConfirming,
            pressed && styles.btnPressed,
          ]}>
          <Text
            style={[
              styles.nukeBtnText,
              confirmingReset && styles.nukeBtnTextConfirming,
            ]}>
            {confirmingReset
              ? '⚠️ CONFIRM FACTORY RESET? (CANNOT UNDO)'
              : '🗑️ Factory Reset Local Vault'}
          </Text>
        </Pressable>
        {confirmingReset ? (
          <Pressable
            onPress={() => setConfirmingReset(false)}
            style={styles.cancelResetBtn}>
            <Text style={styles.cancelResetText}>Cancel</Text>
          </Pressable>
        ) : null}
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
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 1.2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFB800',
    letterSpacing: 0.6,
  },
  actionsList: {
    backgroundColor: '#07090E',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 18,
  },
  actionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  actionSub: {
    fontSize: 9.5,
    color: '#8E9BB0',
    marginTop: 1,
  },
  actionChevron: {
    fontSize: 18,
    color: '#65738E',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginHorizontal: 10,
  },
  dangerZone: {
    marginTop: 4,
    gap: 6,
  },
  nukeBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.35)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nukeBtnConfirming: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  nukeBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FF6B6B',
    letterSpacing: 0.5,
  },
  nukeBtnTextConfirming: {
    color: '#FFFFFF',
  },
  cancelResetBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  cancelResetText: {
    fontSize: 11,
    color: '#8E9BB0',
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
