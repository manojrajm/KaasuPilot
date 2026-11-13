import { getDb } from '@/data/db/client';

/** Typed settings and their defaults. */
export interface AppSettings {
  /** Day of month the salary usually arrives (1–31). Drives safe-to-spend. */
  salaryDay: number;
}

const DEFAULTS: AppSettings = {
  salaryDay: 1,
};

type SettingKey = keyof AppSettings;

const listeners: Set<() => void> = new Set();

export const settingsRepo = {
  subscribe(callback: () => void) {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  },

  async get<K extends SettingKey>(key: K): Promise<AppSettings[K]> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value_json: string }>(
      'SELECT value_json FROM settings WHERE key = ?',
      key
    );
    if (!row) return DEFAULTS[key];
    try {
      return JSON.parse(row.value_json) as AppSettings[K];
    } catch {
      return DEFAULTS[key];
    }
  },

  async set<K extends SettingKey>(key: K, value: AppSettings[K]): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO settings (key, value_json) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
      key,
      JSON.stringify(value)
    );
    listeners.forEach((fn) => fn());
  },
};
