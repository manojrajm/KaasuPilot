import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Category3DIcon } from '@/components/ui/Category3DIcon';
import { CategoryEditorModal } from './CategoryEditorModal';
import { Category } from '@/domain/types';
import { useCategories } from '@/hooks/useCategories';
import { categoryRepo } from '@/data/repositories/categoryRepo';

interface CategoryStudioModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory?: (category: Category) => void;
}

export function CategoryStudioModal({
  visible,
  onClose,
  onSelectCategory,
}: CategoryStudioModalProps) {
  const {
    expenseCategories,
    incomeCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    resetDefaults,
  } = useCategories();

  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [editorDefaultType, setEditorDefaultType] = useState<'expense' | 'income'>('expense');
  const [txCounts, setTxCounts] = useState<Record<string, number>>({});

  const activeCategories = activeTab === 'expense' ? expenseCategories : incomeCategories;

  // Filter based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return activeCategories;
    const q = searchQuery.toLowerCase().trim();
    return activeCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.emoji.includes(q) ||
        (c.taxSection && c.taxSection.toLowerCase().includes(q))
    );
  }, [activeCategories, searchQuery]);

  // Load transaction counts for visible categories
  React.useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    (async () => {
      const counts: Record<string, number> = {};
      for (const cat of activeCategories) {
        counts[cat.id] = await categoryRepo.getTransactionCount(cat.id);
      }
      if (isMounted) setTxCounts(counts);
    })();
    return () => {
      isMounted = false;
    };
  }, [visible, activeCategories]);

  const handleCreateNew = () => {
    setEditingCategory(null);
    setEditorDefaultType(activeTab);
    setIsEditorVisible(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setEditorDefaultType(category.categoryType === 'income' ? 'income' : 'expense');
    setIsEditorVisible(true);
  };

  const handleDelete = (category: Category) => {
    const count = txCounts[category.id] || 0;
    const isSystem = category.isSystem;

    if (isSystem) {
      Alert.alert(
        'Archive System Category',
        `"${category.name}" is a default category. It will be hidden from selection lists but past transactions will keep their categorization.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive',
            style: 'destructive',
            onPress: async () => {
              await deleteCategory(category.id);
            },
          },
        ]
      );
      return;
    }

    if (count > 0) {
      const fallbackId =
        activeTab === 'expense' ? 'cat_expense_other' : 'cat_inc_other';
      Alert.alert(
        'Transactions Found',
        `"${category.name}" is used in ${count} transaction${count === 1 ? '' : 's'}. Would you like to reassign them to "General / Other" or archive this category?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Archive Only',
            onPress: async () => {
              await deleteCategory(category.id);
            },
          },
          {
            text: 'Reassign & Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteCategory(category.id, fallbackId);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete Category',
        `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteCategory(category.id);
            },
          },
        ]
      );
    }
  };

  const handleSaveEditor = async (data: {
    name: string;
    emoji: string;
    color: string;
    gradientColors: [string, string];
    categoryType: 'expense' | 'income' | 'both';
    taxSection?: '80C' | '80D' | 'HRA' | null;
  }) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data);
    } else {
      const created = await createCategory(data);
      if (onSelectCategory) {
        onSelectCategory(created);
      }
    }
  };

  const handleResetDefaults = () => {
    Alert.alert(
      'Restore Defaults',
      'Restore all default categories back to original names, colors, and visibility? Custom categories will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            await resetDefaults();
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* TOP APP BAR */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>CATEGORY STUDIO</Text>
            <Text style={styles.headerSubtitle}>
              Personalize expense taxonomy & income streams
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* DUAL MODE SELECTOR TABS */}
        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('expense')}
            style={[
              styles.tabBtn,
              activeTab === 'expense' && styles.tabBtnActiveExpense,
            ]}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'expense' && styles.tabBtnTextActiveExpense,
              ]}>
              💳 EXPENSE ({expenseCategories.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('income')}
            style={[
              styles.tabBtn,
              activeTab === 'income' && styles.tabBtnActiveIncome,
            ]}>
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'income' && styles.tabBtnTextActiveIncome,
              ]}>
              💰 INCOME ({incomeCategories.length})
            </Text>
          </Pressable>
        </View>

        {/* SEARCH & ACTION ROW */}
        <View style={styles.searchActionRow}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={`Search ${activeTab} categories...`}
              placeholderTextColor="#65738E"
              style={styles.searchInput}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Text style={styles.searchClearText}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={handleCreateNew}
            style={[
              styles.addNewBtn,
              activeTab === 'income' ? styles.addNewBtnIncome : styles.addNewBtnExpense,
            ]}>
            <Text
              style={[
                styles.addNewBtnText,
                activeTab === 'income'
                  ? styles.addNewBtnTextIncome
                  : styles.addNewBtnTextExpense,
              ]}>
              + ADD NEW
            </Text>
          </Pressable>
        </View>

        {/* CATEGORY LIST */}
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const count = txCounts[item.id] || 0;
            return (
              <View style={styles.categoryCard}>
                <Category3DIcon
                  emoji={item.emoji}
                  color={item.color}
                  gradientColors={item.gradientColors}
                  size={46}
                />

                <View style={styles.categoryInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.categoryName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.isSystem ? (
                      <View style={styles.systemBadge}>
                        <Text style={styles.systemBadgeText}>DEFAULT</Text>
                      </View>
                    ) : (
                      <View style={styles.customBadge}>
                        <Text style={styles.customBadgeText}>CUSTOM</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.txCountText}>
                      {count} {count === 1 ? 'transaction' : 'transactions'}
                    </Text>

                    {item.taxSection ? (
                      <View style={styles.taxPill}>
                        <Text style={styles.taxPillText}>{item.taxSection}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionCol}>
                  <Pressable
                    onPress={() => handleEdit(item)}
                    style={styles.actionIconBtn}
                    hitSlop={8}>
                    <Text style={styles.editIconText}>✎</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleDelete(item)}
                    style={styles.actionIconBtn}
                    hitSlop={8}>
                    <Text style={styles.deleteIconText}>🗑</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No categories found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? `No matches for "${searchQuery}"`
                  : `Add your first ${activeTab} category`}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footerContainer}>
              <Pressable
                onPress={handleResetDefaults}
                style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>RESTORE SYSTEM DEFAULTS</Text>
              </Pressable>
            </View>
          }
        />

        {/* CATEGORY EDITOR MODAL */}
        <CategoryEditorModal
          visible={isEditorVisible}
          category={editingCategory}
          defaultType={editorDefaultType}
          onClose={() => setIsEditorVisible(false)}
          onSave={handleSaveEditor}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090E',
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E9BB0',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141C2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0E131F',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtnActiveExpense: {
    backgroundColor: 'rgba(255, 149, 0, 0.12)',
    borderColor: '#FF9500',
  },
  tabBtnActiveIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: '#00E676',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#65738E',
    letterSpacing: 0.8,
  },
  tabBtnTextActiveExpense: {
    color: '#FF9500',
  },
  tabBtnTextActiveIncome: {
    color: '#00E676',
  },
  searchActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E131F',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  searchClearText: {
    color: '#8E9BB0',
    fontSize: 13,
    paddingHorizontal: 4,
  },
  addNewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addNewBtnExpense: {
    backgroundColor: 'rgba(255, 149, 0, 0.16)',
    borderColor: '#FF9500',
  },
  addNewBtnIncome: {
    backgroundColor: 'rgba(0, 230, 118, 0.16)',
    borderColor: '#00E676',
  },
  addNewBtnText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  addNewBtnTextExpense: {
    color: '#FFA826',
  },
  addNewBtnTextIncome: {
    color: '#00E676',
  },
  listContent: {
    padding: 20,
    gap: 10,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E131F',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  categoryInfo: {
    marginLeft: 14,
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    maxWidth: '70%',
  },
  systemBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(142, 155, 176, 0.12)',
  },
  systemBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 0.5,
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(0, 240, 255, 0.14)',
    borderWidth: 0.5,
    borderColor: '#00F0FF',
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txCountText: {
    fontSize: 12,
    color: '#65738E',
    fontWeight: '600',
  },
  taxPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  taxPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00F0FF',
  },
  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#141C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconText: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteIconText: {
    color: '#FF5E3A',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySub: {
    fontSize: 13,
    color: '#65738E',
  },
  footerContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#141C2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E9BB0',
    letterSpacing: 1,
  },
});
