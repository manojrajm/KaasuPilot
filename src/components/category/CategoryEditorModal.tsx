import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Category3DIcon } from '@/components/ui/Category3DIcon';
import { Category } from '@/domain/types';

export interface CategoryPresetPalette {
  name: string;
  color: string;
  gradientColors: [string, string];
}

export const PRESET_PALETTES: CategoryPresetPalette[] = [
  { name: 'Amber Glow', color: '#FF9500', gradientColors: ['#FF9500', '#FF5E3A'] },
  { name: 'Cyber Cyan', color: '#00F0FF', gradientColors: ['#00F0FF', '#0091FF'] },
  { name: 'Emerald Mint', color: '#30D158', gradientColors: ['#30D158', '#1C9C3D'] },
  { name: 'Royal Violet', color: '#AF52DE', gradientColors: ['#AF52DE', '#782AEB'] },
  { name: 'Cyber Gold', color: '#FFD600', gradientColors: ['#FFD600', '#FF9E00'] },
  { name: 'Neon Crimson', color: '#FF2D55', gradientColors: ['#FF2D55', '#E00034'] },
  { name: 'Matrix Green', color: '#00E676', gradientColors: ['#00E676', '#00B0FF'] },
  { name: 'Deep Indigo', color: '#5856D6', gradientColors: ['#5856D6', '#3634A3'] },
  { name: 'Rose Coral', color: '#FF375F', gradientColors: ['#FF375F', '#FF2D55'] },
  { name: 'Ice Azure', color: '#64D2FF', gradientColors: ['#64D2FF', '#0A84FF'] },
  { name: 'Sunset Bronze', color: '#FF9F0A', gradientColors: ['#FF9F0A', '#D97706'] },
  { name: 'Gunmetal Slate', color: '#8E9BB0', gradientColors: ['#8E9BB0', '#65738E'] },
];

const EMOJI_GROUPS = [
  {
    name: 'Popular',
    emojis: ['🍔', '☕', '🚗', '🛒', '🛍️', '💡', '💊', '🎬', '🏦', '📚', '✈️', '💼', '💻', '📈', '🎁', '💳'],
  },
  {
    name: 'Food & Dining',
    emojis: ['🍔', '🍕', '🍜', '🍣', '☕', '🍻', '🍷', '🍩', '🥗', '🥑', '🥐', '🍦', '🥩', '🥪', '🍱'],
  },
  {
    name: 'Travel & Commute',
    emojis: ['🚗', '🚕', '🚌', '🚇', '✈️', '🚂', '⛽', '🛵', '🚲', '🛳️', '🏨', '🗺️', '🧳', '🛴', '🚀'],
  },
  {
    name: 'Lifestyle & Goods',
    emojis: ['🛍️', '👕', '👟', '💄', '🎮', '🎧', '📱', '💻', '⌚', '🎁', '💍', '⚽', '🏸', '🏋️', '🛹'],
  },
  {
    name: 'Home & Bills',
    emojis: ['🏠', '💡', '🔌', '💧', '📶', '🧹', '🛋️', '👶', '🐶', '🐱', '🪴', '🔧', '📦', '🪑', '🗑️'],
  },
  {
    name: 'Health & Care',
    emojis: ['💊', '🩺', '🏥', '🏋️', '🧘', '🦷', '🧴', '🩹', '🍎', '🏃', '👓', '💆', '🧪', '🌡️', '🧠'],
  },
  {
    name: 'Income & Crypto',
    emojis: ['💼', '💵', '🪙', '📈', '💻', '🏢', '🎁', '💳', '🏦', '🧾', '🤝', '💰', '💎', '📊', '🏷️'],
  },
];

interface CategoryEditorModalProps {
  visible: boolean;
  category?: Category | null;
  defaultType?: 'expense' | 'income';
  onClose: () => void;
  onSave: (data: {
    name: string;
    emoji: string;
    color: string;
    gradientColors: [string, string];
    categoryType: 'expense' | 'income' | 'both';
    taxSection?: '80C' | '80D' | 'HRA' | null;
  }) => Promise<void> | void;
}

function CategoryEditorContent({
  category,
  defaultType,
  onClose,
  onSave,
}: {
  category?: Category | null;
  defaultType: 'expense' | 'income';
  onClose: () => void;
  onSave: CategoryEditorModalProps['onSave'];
}) {
  const initialPalette = category
    ? PRESET_PALETTES.find(
        (p) => p.color.toLowerCase() === category.color.toLowerCase()
      ) ?? {
        name: 'Custom',
        color: category.color,
        gradientColors: category.gradientColors,
      }
    : defaultType === 'income'
    ? PRESET_PALETTES[6]
    : PRESET_PALETTES[0];

  const [name, setName] = useState(category?.name ?? '');
  const [categoryType, setCategoryType] = useState<'expense' | 'income' | 'both'>(
    category?.categoryType ?? defaultType
  );
  const [selectedEmoji, setSelectedEmoji] = useState(
    category?.emoji ?? (defaultType === 'income' ? '💼' : '🛍️')
  );
  const [selectedPalette, setSelectedPalette] =
    useState<CategoryPresetPalette>(initialPalette);
  const [taxSection, setTaxSection] = useState<'80C' | '80D' | 'HRA' | null>(
    category?.taxSection ?? null
  );
  const [activeEmojiTab, setActiveEmojiTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a category name');
      return;
    }
    if (!selectedEmoji) {
      setError('Please pick an emoji icon');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: trimmedName,
        emoji: selectedEmoji,
        color: selectedPalette.color,
        gradientColors: selectedPalette.gradientColors,
        categoryType,
        taxSection,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isIncome = categoryType === 'income';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.modalOverlay}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />

      <View style={styles.sheetContainer}>
        {/* Top Bar with Accent Pill */}
        <View style={styles.dragPill} />

        {/* Modal Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              {category ? 'EDIT CATEGORY' : 'NEW CUSTOM CATEGORY'}
            </Text>
            <Text style={styles.headerSub}>
              Customize icons, gradients & telemetry tags
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}>
          {/* 3D LIVE PREVIEW HERO */}
          <View
            style={[
              styles.previewHero,
              {
                borderColor: selectedPalette.color + '44',
                shadowColor: selectedPalette.color,
              },
            ]}>
            <View
              style={[
                styles.previewGlowBackdrop,
                { backgroundColor: selectedPalette.color + '1A' },
              ]}
            />

            <Category3DIcon
              emoji={selectedEmoji}
              color={selectedPalette.color}
              gradientColors={selectedPalette.gradientColors}
              size={70}
              selected={true}
            />

            <View style={styles.previewMeta}>
              <Text style={styles.previewNameText}>
                {name.trim() || 'Untitled Category'}
              </Text>
              <View style={styles.previewTagRow}>
                <View
                  style={[
                    styles.typeBadge,
                    isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense,
                  ]}>
                  <Text
                    style={[
                      styles.typeBadgeText,
                      isIncome
                        ? styles.typeBadgeTextIncome
                        : styles.typeBadgeTextExpense,
                    ]}>
                    {categoryType === 'income'
                      ? '+ INFLOW'
                      : categoryType === 'both'
                      ? '⇄ DUAL'
                      : '- OUTFLOW'}
                  </Text>
                </View>

                {taxSection ? (
                  <View style={styles.taxBadge}>
                    <Text style={styles.taxBadgeText}>TAX {taxSection}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* FIELD 1: CATEGORY NAME */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>CATEGORY NAME</Text>
            <TextInput
              value={name}
              onChangeText={(val) => {
                setName(val);
                if (error) setError(null);
              }}
              placeholder="e.g. Badminton Club, Cloud Subs, Side Hustle"
              placeholderTextColor="#65738E"
              maxLength={30}
              style={styles.textInput}
            />
          </View>

          {/* FIELD 2: TYPE SELECTOR (EXPENSE / INCOME) */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>STREAM TYPE</Text>
            <View style={styles.typeSegmentRow}>
              <Pressable
                onPress={() => setCategoryType('expense')}
                style={[
                  styles.typeSegmentBtn,
                  categoryType === 'expense' && styles.typeSegmentBtnActiveExpense,
                ]}>
                <Text
                  style={[
                    styles.typeSegmentText,
                    categoryType === 'expense' &&
                      styles.typeSegmentTextActiveExpense,
                  ]}>
                  💳 Expense (Outflow)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setCategoryType('income')}
                style={[
                  styles.typeSegmentBtn,
                  categoryType === 'income' && styles.typeSegmentBtnActiveIncome,
                ]}>
                <Text
                  style={[
                    styles.typeSegmentText,
                    categoryType === 'income' &&
                      styles.typeSegmentTextActiveIncome,
                  ]}>
                  💰 Income (Inflow)
                </Text>
              </Pressable>
            </View>
          </View>

          {/* FIELD 3: GRADIENT & COLOR PALETTE */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>3D COLOR THEME</Text>
              <Text style={styles.sectionHint}>{selectedPalette.name}</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paletteScroll}>
              {PRESET_PALETTES.map((palette) => {
                const isSelected = selectedPalette.color === palette.color;
                return (
                  <Pressable
                    key={palette.name}
                    onPress={() => setSelectedPalette(palette)}
                    style={[
                      styles.paletteSwatch,
                      { backgroundColor: palette.color },
                      isSelected && styles.paletteSwatchSelected,
                    ]}>
                    {isSelected ? <Text style={styles.swatchCheck}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* FIELD 4: CURATED EMOJI PICKER */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>GLYPH ICON (EMOJI)</Text>
              <View style={styles.customEmojiInputRow}>
                <Text style={styles.customEmojiHint}>Custom:</Text>
                <TextInput
                  value={selectedEmoji}
                  onChangeText={(val) => setSelectedEmoji(val.slice(-2) || '✨')}
                  maxLength={2}
                  style={styles.customEmojiInput}
                />
              </View>
            </View>

            {/* Group Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiTabsScroll}>
              {EMOJI_GROUPS.map((grp, idx) => {
                const isTabActive = activeEmojiTab === idx;
                return (
                  <Pressable
                    key={grp.name}
                    onPress={() => setActiveEmojiTab(idx)}
                    style={[
                      styles.emojiTabBtn,
                      isTabActive && styles.emojiTabBtnActive,
                    ]}>
                    <Text
                      style={[
                        styles.emojiTabText,
                        isTabActive && styles.emojiTabTextActive,
                      ]}>
                      {grp.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Emoji Grid */}
            <View style={styles.emojiGrid}>
              {EMOJI_GROUPS[activeEmojiTab].emojis.map((emoji) => {
                const isSelected = selectedEmoji === emoji;
                return (
                  <Pressable
                    key={emoji}
                    onPress={() => setSelectedEmoji(emoji)}
                    style={[
                      styles.emojiGridItem,
                      isSelected && {
                        backgroundColor: selectedPalette.color + '26',
                        borderColor: selectedPalette.color,
                      },
                    ]}>
                    <Text style={styles.emojiGridText}>{emoji}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* FIELD 5: TAX PLANNING TAG (OPTIONAL) */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>TAX PLANNING TAG</Text>
              <Text style={styles.sectionHint}>
                Optional Indian IT Act exemption
              </Text>
            </View>

            <View style={styles.taxPillRow}>
              {([null, '80C', '80D', 'HRA'] as const).map((tag) => {
                const isSelected = taxSection === tag;
                return (
                  <Pressable
                    key={tag || 'none'}
                    onPress={() => setTaxSection(tag)}
                    style={[
                      styles.taxPill,
                      isSelected && styles.taxPillSelected,
                    ]}>
                    <Text
                      style={[
                        styles.taxPillText,
                        isSelected && styles.taxPillTextSelected,
                      ]}>
                      {tag ? `Section ${tag}` : 'No Tax Tag'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ACTION BUTTONS */}
          <View style={styles.actionRow}>
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={isSubmitting}
              style={[
                styles.saveBtn,
                { backgroundColor: isIncome ? '#00E676' : selectedPalette.color },
              ]}>
              <Text style={styles.saveBtnText}>
                {isSubmitting
                  ? 'SAVING...'
                  : category
                  ? 'UPDATE CATEGORY'
                  : 'SAVE CATEGORY'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

export function CategoryEditorModal({
  visible,
  category,
  defaultType = 'expense',
  onClose,
  onSave,
}: CategoryEditorModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <CategoryEditorContent
        key={`${category?.id ?? 'new'}_${defaultType}`}
        category={category}
        defaultType={defaultType}
        onClose={onClose}
        onSave={onSave}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 12, 0.78)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#0E131F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
  },
  dragPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  headerSub: {
    fontSize: 12,
    color: '#8E9BB0',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    gap: 18,
  },
  previewHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12192A',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  previewGlowBackdrop: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  previewMeta: {
    marginLeft: 16,
    flex: 1,
    gap: 6,
  },
  previewNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  previewTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeExpense: {
    backgroundColor: 'rgba(255, 94, 58, 0.16)',
    borderColor: '#FF5E3A',
    borderWidth: 1,
  },
  typeBadgeIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.16)',
    borderColor: '#00E676',
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  typeBadgeTextExpense: {
    color: '#FF7A59',
  },
  typeBadgeTextIncome: {
    color: '#00E676',
  },
  taxBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: '#00F0FF',
    borderWidth: 1,
  },
  taxBadgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 45, 85, 0.16)',
    borderColor: '#FF2D55',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: '#FF647C',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 1.1,
  },
  sectionHint: {
    fontSize: 11,
    color: '#65738E',
  },
  textInput: {
    backgroundColor: '#141C2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  typeSegmentRow: {
    flexDirection: 'row',
    backgroundColor: '#141C2E',
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  typeSegmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeSegmentBtnActiveExpense: {
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    borderColor: '#FF9500',
    borderWidth: 1,
  },
  typeSegmentBtnActiveIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    borderColor: '#00E676',
    borderWidth: 1,
  },
  typeSegmentText: {
    color: '#8E9BB0',
    fontSize: 13,
    fontWeight: '700',
  },
  typeSegmentTextActiveExpense: {
    color: '#FFA826',
  },
  typeSegmentTextActiveIncome: {
    color: '#00E676',
  },
  paletteScroll: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  paletteSwatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paletteSwatchSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
    shadowColor: '#FFF',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  swatchCheck: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  customEmojiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customEmojiHint: {
    fontSize: 11,
    color: '#65738E',
  },
  customEmojiInput: {
    width: 32,
    height: 28,
    backgroundColor: '#141C2E',
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emojiTabsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  emojiTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#141C2E',
  },
  emojiTabBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
    borderWidth: 1,
  },
  emojiTabText: {
    color: '#8E9BB0',
    fontSize: 11,
    fontWeight: '700',
  },
  emojiTabTextActive: {
    color: '#00F0FF',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#141C2E',
    padding: 10,
    borderRadius: 14,
    justifyContent: 'flex-start',
  },
  emojiGridItem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: '#1A233A',
  },
  emojiGridText: {
    fontSize: 22,
  },
  taxPillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  taxPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#141C2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  taxPillSelected: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  taxPillText: {
    color: '#8E9BB0',
    fontSize: 12,
    fontWeight: '700',
  },
  taxPillTextSelected: {
    color: '#00F0FF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#141C2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelBtnText: {
    color: '#8E9BB0',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    color: '#07090E',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
});
