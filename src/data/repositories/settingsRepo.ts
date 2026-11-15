import { getDb } from '@/data/db/client';
import {
  DEFAULT_EXPERIENCE,
  DEFAULT_PROFILE,
  DEFAULT_SALARY_STATE,
  DEFAULT_SECURITY,
  ExperienceSettings,
  SalaryState,
  SecuritySettings,
  UserProfile,
} from '@/domain/profile/types';

/** Bookkeeping for the SMS inbox catch-up scan. */
export interface SmsScanState {
  /** Epoch ms of the newest inbox SMS already scanned (null = never scanned). */
  lastScannedAt: number | null;
}

/** Every persisted setting and its type. */
export interface AppSettings {
  profile: UserProfile;
  security: SecuritySettings;
  experience: ExperienceSettings;
  salaryState: SalaryState;
  smsScan: SmsScanState;
}

const DEFAULTS: AppSettings = {
  profile: DEFAULT_PROFILE,
  security: DEFAULT_SECURITY,
  experience: DEFAULT_EXPERIENCE,
  salaryState: DEFAULT_SALARY_STATE,
  smsScan: { lastScannedAt: null },
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

  /** Stored value merged over the defaults, so fields added in later versions get their default. */
  async get<K extends SettingKey>(key: K): Promise<AppSettings[K]> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value_json: string }>(
      'SELECT value_json FROM settings WHERE key = ?',
      key
    );
    if (!row) return { ...DEFAULTS[key] };
    try {
      return { ...DEFAULTS[key], ...(JSON.parse(row.value_json) as Partial<AppSettings[K]>) };
    } catch {
      return { ...DEFAULTS[key] };
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

  /** Merges `patch` into the stored value and returns the result. */
  async update<K extends SettingKey>(key: K, patch: Partial<AppSettings[K]>): Promise<AppSettings[K]> {
    const next = { ...(await settingsRepo.get(key)), ...patch };
    await settingsRepo.set(key, next);
    return next;
  },

  /** Restores one setting group to its defaults. */
  async reset(key: SettingKey): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM settings WHERE key = ?', key);
    listeners.forEach((fn) => fn());
  },
};
