import * as SecureStore from 'expo-secure-store';

/** Sensitive card fields. They never touch SQLite, logs or backups. */
export interface CardSecrets {
  number: string;
  expiry: string;
  cvv: string;
}

const keyFor = (cardId: string) => `card_secret_${cardId}`;

/**
 * Stores card secrets in the OS keystore (Android Keystore / iOS Keychain),
 * readable only by this app and only while the device is unlocked.
 * The app asks for biometrics/PIN before calling `read`.
 */
export const cardVault = {
  async save(cardId: string, secrets: CardSecrets): Promise<void> {
    await SecureStore.setItemAsync(keyFor(cardId), JSON.stringify(secrets), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async read(cardId: string): Promise<CardSecrets | null> {
    const raw = await SecureStore.getItemAsync(keyFor(cardId), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CardSecrets;
    } catch {
      return null;
    }
  },

  async remove(cardId: string): Promise<void> {
    await SecureStore.deleteItemAsync(keyFor(cardId), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
};
