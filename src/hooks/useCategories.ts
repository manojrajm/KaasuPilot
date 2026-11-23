import { useCallback, useEffect, useMemo, useState } from 'react';
import { Category } from '@/domain/types';
import { categoryRepo } from '@/data/repositories/categoryRepo';
import { DEFAULT_CATEGORIES } from '@/data/seed/defaultCategories';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [allWithArchived, setAllWithArchived] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    Promise.all([
      categoryRepo.getAll({ includeArchived: false }),
      categoryRepo.getAll({ includeArchived: true }),
    ])
      .then(([activeList, allList]) => {
        setCategories(activeList);
        setAllWithArchived(allList);
        setLoading(false);
      })
      .catch((e) => {
        console.warn('[useCategories] Failed to load categories, using defaults:', e);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => {
      Promise.all([
        categoryRepo.getAll({ includeArchived: false }),
        categoryRepo.getAll({ includeArchived: true }),
      ])
        .then(([activeList, allList]) => {
          if (!active) return;
          setCategories(activeList);
          setAllWithArchived(allList);
          setLoading(false);
        })
        .catch((e) => {
          console.warn('[useCategories] Failed to load categories, using defaults:', e);
          if (active) setLoading(false);
        });
    };

    load();
    const unsubscribe = categoryRepo.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.categoryType === 'expense' || c.categoryType === 'both'),
    [categories]
  );

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.categoryType === 'income' || c.categoryType === 'both'),
    [categories]
  );

  const byId = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const cat of DEFAULT_CATEGORIES) {
      map[cat.id] = cat;
    }
    for (const cat of allWithArchived) {
      map[cat.id] = cat;
    }
    return map;
  }, [allWithArchived]);

  const createCategory = useCallback(
    async (input: {
      name: string;
      emoji: string;
      color: string;
      gradientColors: [string, string];
      categoryType: 'expense' | 'income' | 'both';
      taxSection?: '80C' | '80D' | 'HRA' | null;
    }) => {
      const created = await categoryRepo.create(input);
      reload();
      return created;
    },
    [reload]
  );

  const updateCategory = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Category, 'id' | 'isSystem' | 'createdAt' | 'updatedAt'>>
    ) => {
      await categoryRepo.update(id, updates);
      reload();
    },
    [reload]
  );

  const deleteCategory = useCallback(
    async (id: string, reassignToCategoryId?: string) => {
      const res = await categoryRepo.delete(id, reassignToCategoryId);
      reload();
      return res;
    },
    [reload]
  );

  const resetDefaults = useCallback(async () => {
    await categoryRepo.resetDefaults();
    reload();
  }, [reload]);

  return {
    categories,
    expenseCategories,
    incomeCategories,
    allCategories: categories,
    byId,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    resetDefaults,
    refresh: reload,
  };
}
