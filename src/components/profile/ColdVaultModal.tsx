import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { Spacing } from '@/constants/theme';
import {
  coldVaultBackupService,
  MIN_PASSPHRASE_LENGTH,
  RestoreMode,
} from '@/services/coldVaultBackup';

interface ColdVaultModalProps {
  visible: boolean;
  initialMode?: 'export' | 'restore';
  onClose: () => void;
  onRestoreSuccess: (summary: string) => void;
}

export function ColdVaultModal({
  visible,
  initialMode = 'export',
  onClose,
  onRestoreSuccess,
}: ColdVaultModalProps) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'export' | 'restore'>(initialMode);
  const [pin, setPin] = useState('');
  const [restoreContent, setRestoreContent] = useState('');
  const [pickedName, setPickedName] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [exportResult, setExportResult] = useState<{
    fileUri: string | null;
    vaultJson: string;
    meta: { transactionsCount: number; loansCount: number };
  } | null>(null);

  const handleExport = async () => {
    if (pin.length < MIN_PASSPHRASE_LENGTH) {
      Alert.alert(
        'Passphrase too short',
        `Use at least ${MIN_PASSPHRASE_LENGTH} characters. A longer passphrase is much harder to guess if the file is ever copied.`
      );
      return;
    }

    setIsProcessing(true);
    try {
      const res = await coldVaultBackupService.createEncryptedVault(pin);
      setExportResult(res);
      await coldVaultBackupService.shareVault(res.fileUri, res.vaultJson);
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Could not export encrypted vault.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasteClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text && text.includes('KASUVAULT_AES256')) {
      setRestoreContent(text);
      Alert.alert('Clipboard Loaded', 'Valid .kasuvault payload detected and pasted.');
    } else {
      Alert.alert('Invalid Data', 'Clipboard does not contain a valid .kasuvault payload.');
    }
  };

  const handlePickFile = async () => {
    try {
      const picked = await coldVaultBackupService.pickVaultFile();
      if (!picked) return;
      if (!picked.content.includes('KASUVAULT_AES256')) {
        Alert.alert('Not a backup file', 'The chosen file is not a KasuPilot .kasuvault backup.');
        return;
      }
      setRestoreContent(picked.content);
      setPickedName(picked.name);
    } catch (err: any) {
      Alert.alert('Could not open file', err.message || 'Please try again.');
    }
  };

  const runRestore = async () => {
    setIsProcessing(true);
    try {
      const res = await coldVaultBackupService.restoreEncryptedVault(restoreContent, pin, restoreMode);
      if (res.success && res.restoredCount) {
        onClose();
        onRestoreSuccess(
          `Restored ${res.restoredCount.transactions} transactions, ${res.restoredCount.loans} loans, and ${res.restoredCount.accounts} accounts into device ledger.`
        );
      } else {
        Alert.alert('Restore Failed', res.error || 'Could not decrypt vault.');
      }
    } catch (err: any) {
      Alert.alert('Restore Error', err.message || 'Failed to restore vault.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = () => {
    if (!restoreContent.trim()) {
      Alert.alert('Backup file required', 'Choose a .kasuvault file (or paste its contents) to restore.');
      return;
    }
    if (!pin) {
      Alert.alert('Passphrase required', 'Enter the passphrase used when this backup was created.');
      return;
    }
    if (restoreMode === 'replace') {
      Alert.alert(
        'Replace all data?',
        'All current transactions, loans and cards on this device will be erased and replaced by the backup. This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: runRestore },
        ]
      );
      return;
    }
    runRestore();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.dismissBackdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Top Drag Handle Indicator */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandleBar} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={styles.badgeRow}>
                <Text style={styles.badgeIcon}>🛡️</Text>
                <Text style={styles.badgeText}>DATA SOVEREIGNTY ENGINE</Text>
              </View>
              <Text style={styles.title}>Cold Vault Backup & Restore</Text>
            </View>

            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {/* Mode Switch Tabs */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => {
                setMode('export');
                setExportResult(null);
              }}
              style={[styles.tabBtn, mode === 'export' && styles.tabBtnActive]}>
              <Text style={[styles.tabBtnText, mode === 'export' && styles.tabBtnTextActive]}>
                📤 Export .kasuvault
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMode('restore');
                setExportResult(null);
              }}
              style={[styles.tabBtn, mode === 'restore' && styles.tabBtnActive]}>
              <Text style={[styles.tabBtnText, mode === 'restore' && styles.tabBtnTextActive]}>
                📥 Restore Backup
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(96, insets.bottom + 48) },
            ]}>
            {mode === 'export' ? (
              /* Export View */
              <View style={styles.section}>
                <View style={styles.infoBanner}>
                  <Text style={styles.infoTitle}>Zero Cloud Storage • 100% Offline</Text>
                  <Text style={styles.infoSub}>
                    Generates a hardware AES-256 encrypted .kasuvault file containing your entire ledger.
                    Only someone with your Master PIN can unlock it.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>BACKUP PASSPHRASE (MIN {MIN_PASSPHRASE_LENGTH} CHARACTERS):</Text>
                  <TextInput
                    value={pin}
                    onChangeText={setPin}
                    placeholder="Choose a passphrase you will remember"
                    placeholderTextColor="#5A667D"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                </View>

                <Pressable
                  onPress={handleExport}
                  disabled={isProcessing}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.btnPressed,
                    isProcessing && styles.btnDisabled,
                  ]}>
                  <Text style={styles.primaryBtnText}>
                    {isProcessing ? 'ENCRYPTING VAULT...' : '🔐 GENERATE & SHARE .KASUVAULT'}
                  </Text>
                </Pressable>

                {exportResult ? (
                  <View style={styles.resultBox}>
                    <Text style={styles.resultTitle}>✓ COLD VAULT READY FOR ARCHIVE</Text>
                    <Text style={styles.resultMeta}>
                      Records: {exportResult.meta.transactionsCount} Transactions • {exportResult.meta.loansCount} Loans
                    </Text>
                    <Pressable
                      onPress={async () => {
                        await Clipboard.setStringAsync(exportResult.vaultJson);
                        Alert.alert('Copied', 'Encrypted vault token copied to clipboard.');
                      }}
                      style={styles.secondaryBtn}>
                      <Text style={styles.secondaryBtnText}>📋 Copy Encrypted Vault Token</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              /* Restore View */
              <View style={styles.section}>
                <View style={styles.infoBanner}>
                  <Text style={styles.infoTitle}>Restore on New Device</Text>
                  <Text style={styles.infoSub}>
                    Choose your .kasuvault file, enter the passphrase used when it was created, and your ledger will be restored.
                  </Text>
                </View>

                <Pressable onPress={handlePickFile} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>
                    {pickedName ? `📄 ${pickedName}  (tap to change)` : '📂 Choose .kasuvault file'}
                  </Text>
                </Pressable>

                <View style={styles.tabBar2}>
                  {(['merge', 'replace'] as RestoreMode[]).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setRestoreMode(m)}
                      style={[styles.tabBtn, restoreMode === m && styles.tabBtnActive]}>
                      <Text style={[styles.tabBtnText, restoreMode === m && styles.tabBtnTextActive]}>
                        {m === 'merge' ? 'Merge with existing' : 'Replace everything'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>OR PASTE FILE CONTENTS:</Text>
                    <Pressable onPress={handlePasteClipboard}>
                      <Text style={styles.linkText}>📋 Paste from Clipboard</Text>
                    </Pressable>
                  </View>
                  <TextInput
                    value={restoreContent}
                    onChangeText={setRestoreContent}
                    placeholder="Paste encrypted .kasuvault JSON text here..."
                    placeholderTextColor="#5A667D"
                    multiline
                    numberOfLines={4}
                    style={[styles.textInput, styles.textArea]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>BACKUP PASSPHRASE:</Text>
                  <TextInput
                    value={pin}
                    onChangeText={setPin}
                    placeholder="Enter passphrase"
                    placeholderTextColor="#5A667D"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.textInput}
                  />
                </View>

                <Pressable
                  onPress={handleRestore}
                  disabled={isProcessing}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    styles.restoreBtn,
                    pressed && styles.btnPressed,
                    isProcessing && styles.btnDisabled,
                  ]}>
                  <Text style={styles.primaryBtnText}>
                    {isProcessing ? 'DECRYPTING & RESTORING...' : '🔓 DECRYPT & RESTORE LEDGER'}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  dismissBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: '#0A0D14',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    height: '86%',
    maxHeight: '92%',
    flexDirection: 'column',
    overflow: 'hidden',
    paddingTop: Spacing.two,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeIcon: {
    fontSize: 11,
  },
  badgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#8A96AD',
    fontSize: 15,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: 10,
  },
  tabBar2: {
    flexDirection: 'row',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: '#00F0FF',
  },
  tabBtnText: {
    color: '#8A96AD',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: 80,
  },
  section: {
    gap: Spacing.four,
  },
  infoBanner: {
    backgroundColor: 'rgba(0, 240, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  infoTitle: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '800',
  },
  infoSub: {
    color: '#8A96AD',
    fontSize: 11.5,
    lineHeight: 16,
  },
  inputGroup: {
    gap: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#8A96AD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkText: {
    color: '#00F0FF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#07090E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  primaryBtn: {
    backgroundColor: '#00F0FF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  restoreBtn: {
    backgroundColor: '#00E676',
    shadowColor: '#00E676',
  },
  primaryBtnText: {
    color: '#07090E',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.5,
  },
  resultBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  resultTitle: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '800',
  },
  resultMeta: {
    color: '#8A96AD',
    fontSize: 11.5,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#DCE4F0',
    fontSize: 12,
    fontWeight: '700',
  },
});
