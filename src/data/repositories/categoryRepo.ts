import { Category } from '@/domain/types';
import { getDb } from '@/data/db/client';
import { DEFAULT_CATEGORIES } from '@/data/seed/defaultCategories';
import { createId } from '@/utils/id';

interface CategoryRow {
  id: string;
  name: string;
  icon_name: string;
  emoji: string;
  color: string;
  gradient_colors: string;
  category_type: 'expense' | 'income' | 'both';
  tax_section: '80C' | '80D' | 'HRA' | null;
  is_system: number;
  is_archived: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const listeners: Set<() => void> = new Set();

function notify() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (e) {
      console.warn('[categoryRepo] listener error:', e);
    }
  }
}

function rowToCategory(row: CategoryRow): Category {
  let gradientColors: [string, string];
  try {
    const parsed = JSON.parse(row.gradient_colors);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      gradientColors = [parsed[0], parsed[1]];
    } else {
      gradientColors = [row.color, row.color];
    }
  } catch {
    gradientColors = [row.color, row.color];
  }

  return {
    id: row.id,
    name: row.name,
    iconName: row.icon_name,
    emoji: row.emoji,
    color: row.color,
    gradientColors,
    categoryType: row.category_type,
    taxSection: row.tax_section,
    isSystem: row.is_system === 1,
    isArchived: row.is_archived === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const categoryRepo = {
  subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  notifyChanged(): void {
    notify();
  },

  async getAll(options?: {
    includeArchived?: boolean;
    type?: 'expense' | 'income' | 'both';
  }): Promise<Category[]> {
    const db = await getDb();
    let query = 'SELECT * FROM categories WHERE 1=1';
    const params: (string | number)[] = [];

    if (!options?.includeArchived) {
      query += ' AND is_archived = 0';
    }

    if (options?.type && options.type !== 'both') {
      query += ' AND (category_type = ? OR category_type = "both")';
      params.push(options.type);
    }

    query += ' ORDER BY sort_order ASC, name ASC';

    try {
      const rows = await db.getAllAsync<CategoryRow>(query, ...params);
      if (rows && rows.length > 0) {
        return rows.map(rowToCategory);
      }
    } catch (e) {
      console.warn('[categoryRepo] getAll fallback to defaults:', e);
    }

    // Fallback if table is not yet migrated/populated
    return DEFAULT_CATEGORIES.filter((c) => {
      if (!options?.type || options.type === 'both') return true;
      return c.categoryType === options.type || c.categoryType === 'both';
    });
  },

  async getById(id: string): Promise<Category | null> {
    const db = await getDb();
    try {
      const row = await db.getFirstAsync<CategoryRow>(
        'SELECT * FROM categories WHERE id = ?',
        id
      );
      if (row) return rowToCategory(row);
    } catch (e) {
      console.warn('[categoryRepo] getById error:', e);
    }
    const fallback = DEFAULT_CATEGORIES.find((c) => c.id === id);
    return fallback ?? null;
  },

  async create(data: {
    id?: string;
    name: string;
    iconName?: string;
    emoji: string;
    color: string;
    gradientColors: [string, string];
    categoryType: 'expense' | 'income' | 'both';
    taxSection?: '80C' | '80D' | 'HRA' | null;
  }): Promise<Category> {
    const db = await getDb();
    const id = data.id || createId('cat');
    const now = new Date().toISOString();
    const iconName = data.iconName || 'other';

    // Get max sort_order
    const maxRow = await db.getFirstAsync<{ max_sort: number | null }>(
      'SELECT MAX(sort_order) as max_sort FROM categories WHERE category_type = ? OR category_type = "both"',
      data.categoryType
    );
    const sortOrder = (maxRow?.max_sort ?? 0) + 1;

    await db.runAsync(
      `INSERT INTO categories (
        id, name, icon_name, emoji, color, gradient_colors, category_type,
        tax_section, is_system, is_archived, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)`,
      id,
      data.name.trim(),
      iconName,
      data.emoji.trim(),
      data.color,
      JSON.stringify(data.gradientColors),
      data.categoryType,
      data.taxSection ?? null,
      sortOrder,
      now,
      now
    );

    notify();

    return {
      id,
      name: data.name.trim(),
      iconName,
      emoji: data.emoji.trim(),
      color: data.color,
      gradientColors: data.gradientColors,
      categoryType: data.categoryType,
      taxSection: data.taxSection ?? null,
      isSystem: false,
      isArchived: false,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
  },

  async update(
    id: string,
    updates: Partial<
      Omit<Category, 'id' | 'isSystem' | 'createdAt' | 'updatedAt'>
    >
  ): Promise<void> {
    const db = await getDb();
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Category ${id} does not exist`);
    }

    const now = new Date().toISOString();
    const name = updates.name !== undefined ? updates.name.trim() : existing.name;
    const iconName = updates.iconName !== undefined ? updates.iconName : existing.iconName;
    const emoji = updates.emoji !== undefined ? updates.emoji.trim() : existing.emoji;
    const color = updates.color !== undefined ? updates.color : existing.color;
    const gradientColors =
      updates.gradientColors !== undefined
        ? updates.gradientColors
        : existing.gradientColors;
    const categoryType =
      updates.categoryType !== undefined ? updates.categoryType : existing.categoryType ?? 'expense';
    const taxSection =
      updates.taxSection !== undefined ? updates.taxSection : existing.taxSection ?? null;
    const isArchived =
      updates.isArchived !== undefined ? (updates.isArchived ? 1 : 0) : existing.isArchived ? 1 : 0;
    const sortOrder =
      updates.sortOrder !== undefined ? updates.sortOrder : existing.sortOrder ?? 0;

    await db.runAsync(
      `UPDATE categories SET
        name = ?,
        icon_name = ?,
        emoji = ?,
        color = ?,
        gradient_colors = ?,
        category_type = ?,
        tax_section = ?,
        is_archived = ?,
        sort_order = ?,
        updated_at = ?
      WHERE id = ?`,
      name,
      iconName,
      emoji,
      color,
      JSON.stringify(gradientColors),
      categoryType,
      taxSection,
      isArchived,
      sortOrder,
      now,
      id
    );

    notify();
  },

  async delete(
    id: string,
    reassignToCategoryId?: string
  ): Promise<{ affectedTransactions: number }> {
    const db = await getDb();
    const existing = await this.getById(id);
    if (!existing) return { affectedTransactions: 0 };

    let affectedTransactions = 0;

    await db.withTransactionAsync(async () => {
      const txCountRow = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
        id
      );
      affectedTransactions = txCountRow?.count ?? 0;

      if (affectedTransactions > 0 && reassignToCategoryId) {
        // Reassign all associated transactions to the chosen fallback category
        await db.runAsync(
          'UPDATE transactions SET category_id = ?, updated_at = ? WHERE category_id = ?',
          reassignToCategoryId,
          new Date().toISOString(),
          id
        );
      }

      if (existing.isSystem) {
        // System categories are archived, not deleted, so built-in references remain valid
        await db.runAsync(
          'UPDATE categories SET is_archived = 1, updated_at = ? WHERE id = ?',
          new Date().toISOString(),
          id
        );
      } else if (affectedTransactions > 0 && !reassignToCategoryId) {
        // Custom category with transactions but no reassign target -> safely archive
        await db.runAsync(
          'UPDATE categories SET is_archived = 1, updated_at = ? WHERE id = ?',
          new Date().toISOString(),
          id
        );
      } else {
        // Safe to hard delete custom category
        await db.runAsync('DELETE FROM categories WHERE id = ?', id);
      }
    });

    notify();
    return { affectedTransactions };
  },

  async getTransactionCount(categoryId: string): Promise<number> {
    const db = await getDb();
    try {
      const row = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
        categoryId
      );
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  },

  async resetDefaults(): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // Un-archive and restore system defaults
      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const cat = DEFAULT_CATEGORIES[i];
        await db.runAsync(
          `INSERT INTO categories
             (id, name, icon_name, emoji, color, gradient_colors, category_type, tax_section, is_system, is_archived, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             icon_name = excluded.icon_name,
             emoji = excluded.emoji,
             color = excluded.color,
             gradient_colors = excluded.gradient_colors,
             category_type = excluded.category_type,
             tax_section = excluded.tax_section,
             is_archived = 0,
             sort_order = excluded.sort_order,
             updated_at = excluded.updated_at`,
          cat.id,
          cat.name,
          cat.iconName || 'other',
          cat.emoji,
          cat.color,
          JSON.stringify(cat.gradientColors),
          cat.categoryType || 'expense',
          cat.taxSection ?? null,
          i,
          now,
          now
        );
      }
    });

    notify();
  },
};
