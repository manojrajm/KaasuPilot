import React from 'react';
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

export interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  editable?: boolean;
  rightElement?: React.ReactNode;
  multiline?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  hint,
  error,
  prefix,
  suffix,
  keyboardType = 'default',
  secureTextEntry = false,
  maxLength,
  autoCapitalize = 'none',
  autoCorrect = false,
  editable = true,
  rightElement,
  multiline = false,
  style,
}: FieldProps) {
  const hasError = !!error;

  return (
    <View style={[styles.fieldContainer, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {maxLength ? (
          <Text style={styles.charCount}>
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.inputBox,
          hasError && styles.inputBoxError,
          !editable && styles.inputBoxDisabled,
        ]}>
        {prefix ? <Text style={styles.prefixText}>{prefix}</Text> : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#5A667D"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          multiline={multiline}
          style={[
            styles.textInput,
            prefix ? styles.textInputWithPrefix : undefined,
            suffix ? styles.textInputWithSuffix : undefined,
          ]}
        />

        {suffix ? <Text style={styles.suffixText}>{suffix}</Text> : null}
        {rightElement ? <View style={styles.rightSlot}>{rightElement}</View> : null}
      </View>

      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

export interface ChipOption<T> {
  value: T;
  label: string;
  color?: string;
  subtitle?: string;
}

export interface ChipGroupProps<T> {
  label?: string;
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ChipGroup<T extends string | number | boolean>({
  label,
  options,
  selected,
  onSelect,
  scrollable = false,
  style,
}: ChipGroupProps<T>) {
  const content = (
    <View style={styles.chipsWrap}>
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onSelect(opt.value)}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              isSelected && opt.color ? { borderColor: opt.color } : undefined,
              pressed && styles.btnPressed,
            ]}>
            {opt.color ? (
              <View
                style={[
                  styles.chipColorDot,
                  { backgroundColor: opt.color },
                  isSelected && styles.chipColorDotActive,
                ]}
              />
            ) : null}
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextSelected,
                isSelected && opt.color ? { color: '#FFFFFF' } : undefined,
              ]}>
              {opt.label}
            </Text>
            {opt.subtitle ? (
              <Text style={styles.chipSubtitle}>{opt.subtitle}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.fieldContainer, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollChipsContainer}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export interface PrimaryButtonProps {
  title?: string;
  label?: string;
  onPress: () => void;
  tone?: 'primary' | 'accent' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  title,
  label,
  onPress,
  tone = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
}: PrimaryButtonProps) {
  const isDanger = tone === 'danger';
  const isAccent = tone === 'accent';
  const isGhost = tone === 'ghost';
  const buttonText = label ?? title ?? '';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btnBase,
        tone === 'primary' && styles.btnPrimary,
        isAccent && styles.btnAccent,
        isDanger && styles.btnDanger,
        isGhost && styles.btnGhost,
        disabled && styles.btnDisabled,
        pressed && styles.btnPressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isGhost ? '#8A96AD' : isDanger ? '#FFFFFF' : '#07090E'}
        />
      ) : (
        <View style={styles.btnContentRow}>
          {icon ? <View style={styles.btnIcon}>{icon}</View> : null}
          <Text
            style={[
              styles.btnText,
              tone === 'primary' && styles.btnTextDark,
              isAccent && styles.btnTextDark,
              isDanger && styles.btnTextLight,
              isGhost && styles.btnTextGhost,
              disabled && styles.btnTextDisabled,
            ]}>
            {buttonText}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    gap: 6,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A96AD',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  charCount: {
    fontSize: 9.5,
    color: '#5A667D',
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D111A',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    minHeight: 48,
  },
  inputBoxError: {
    borderColor: '#FF6B61',
    backgroundColor: 'rgba(255, 107, 97, 0.06)',
  },
  inputBoxDisabled: {
    opacity: 0.6,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00F0FF',
    marginRight: 6,
  },
  suffixText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A96AD',
    marginLeft: 6,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '600',
    paddingVertical: 12,
  },
  textInputWithPrefix: {
    paddingLeft: 0,
  },
  textInputWithSuffix: {
    paddingRight: 0,
  },
  rightSlot: {
    marginLeft: 8,
  },
  hintText: {
    fontSize: 11,
    color: '#65738E',
    paddingHorizontal: 4,
    lineHeight: 15,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B61',
    paddingHorizontal: 4,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scrollChipsContainer: {
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#0D111A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chipSelected: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: '#00F0FF',
  },
  chipColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipColorDotActive: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A96AD',
  },
  chipTextSelected: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  chipSubtitle: {
    fontSize: 9.5,
    color: '#65738E',
  },
  btnBase: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  btnPrimary: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  btnAccent: {
    backgroundColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDanger: {
    backgroundColor: '#E53935',
    borderWidth: 1,
    borderColor: '#FF6B61',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  btnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnIcon: {
    marginRight: 2,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  btnTextDark: {
    color: '#07090E',
  },
  btnTextLight: {
    color: '#FFFFFF',
  },
  btnTextGhost: {
    color: '#8A96AD',
  },
  btnTextDisabled: {
    color: '#5A667D',
  },
});
