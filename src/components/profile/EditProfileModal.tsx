import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { UserProfile } from '@/domain/profile/types';
import { toPaise } from '@/domain/money/paise';

interface EditProfileModalProps {
  visible: boolean;
  profile: UserProfile;
  onClose: () => void;
  onSave: (patch: Partial<UserProfile>) => void;
}

export function EditProfileModal({
  visible,
  profile,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [incomeStr, setIncomeStr] = useState(
    String(Math.round(profile.monthlyIncomePaise / 100))
  );
  const [salaryDay, setSalaryDay] = useState(String(profile.salaryDayOfMonth));

  if (!visible) return null;

  const handleSave = () => {
    const finalName = name.trim() || profile.name;
    const finalIncome = toPaise(incomeStr) || profile.monthlyIncomePaise;
    const finalDay = Math.max(1, Math.min(31, parseInt(salaryDay, 10) || 1));

    onSave({
      name: finalName,
      monthlyIncomePaise: finalIncome,
      salaryDayOfMonth: finalDay,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>EDIT PROFILE TELEMETRY</Text>
              <Text style={styles.headerSub}>Updates on-device local state</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.formBody}>
            {/* Field 1: Pilot Name */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>PILOT NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Aravind"
                placeholderTextColor="#65738E"
                style={styles.textInput}
              />
            </View>

            {/* Field 2: Monthly Income */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>MONTHLY BASE INCOME (INR)</Text>
              <View style={styles.incomeInputRow}>
                <Text style={styles.rupeePrefix}>₹</Text>
                <TextInput
                  value={incomeStr}
                  onChangeText={setIncomeStr}
                  keyboardType="numeric"
                  placeholder="62,000"
                  placeholderTextColor="#65738E"
                  style={styles.incomeTextInput}
                />
              </View>
            </View>

            {/* Field 3: Salary Day */}
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>SALARY DAY OF MONTH (1 - 31)</Text>
              <TextInput
                value={salaryDay}
                onChangeText={setSalaryDay}
                keyboardType="numeric"
                maxLength={2}
                placeholder="1"
                placeholderTextColor="#65738E"
                style={styles.textInput}
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [styles.saveBtn, pressed && styles.btnPressed]}>
              <Text style={styles.saveBtnText}>⚡ SAVE TELEMETRY LOCALLY</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0D111A',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 10,
    color: '#8E9BB0',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: '#8E9BB0',
    fontWeight: '700',
  },
  formBody: {
    gap: 14,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: '#07090E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  incomeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#07090E',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  rupeePrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00E676',
  },
  incomeTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 10,
  },
  saveBtn: {
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#07090E',
    letterSpacing: 0.6,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
