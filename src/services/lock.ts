import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'app_lock_pin_v1';
const PIN_LENGTH = 4;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

interface StoredPin {
  salt: string;
  hash: string;
}

const storeOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  // Salted and lightly stretched. The hash itself lives in the hardware keystore; the
  // iteration count is kept low so unlocking with the PIN stays instant on mid-range phones.
  let digest = `${salt}:${pin}`;
  for (let i = 0; i < 300; i++) {
    digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${digest}`);
  }
  return digest;
}

let failedAttempts = 0;
let lockedOutUntil = 0;
/** While > 0, returning from another app does not re-lock (camera, gallery, biometric prompt). */
let autoLockSuspensions = 0;

export type BiometricKind = 'fingerprint' | 'face' | 'iris' | 'none';

export type PinCheck =
  | { ok: true }
  | { ok: false; attemptsLeft: number; lockedForMs: number };

export const lockService = {
  PIN_LENGTH,

  async hasPin(): Promise<boolean> {
    return (await SecureStore.getItemAsync(PIN_KEY, storeOptions)) !== null;
  },

  async setPin(pin: string): Promise<void> {
    if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
      throw new Error(`PIN must be ${PIN_LENGTH} digits`);
    }
    const salt = toHex(await Crypto.getRandomBytesAsync(16));
    const stored: StoredPin = { salt, hash: await hashPin(pin, salt) };
    await SecureStore.setItemAsync(PIN_KEY, JSON.stringify(stored), storeOptions);
    failedAttempts = 0;
    lockedOutUntil = 0;
  },

  /** Checks the PIN, enforcing a 30-second lockout after 5 wrong tries. */
  async verifyPin(pin: string): Promise<PinCheck> {
    const now = Date.now();
    if (now < lockedOutUntil) {
      return { ok: false, attemptsLeft: 0, lockedForMs: lockedOutUntil - now };
    }
    const raw = await SecureStore.getItemAsync(PIN_KEY, storeOptions);
    if (!raw) return { ok: false, attemptsLeft: 0, lockedForMs: 0 };
    const stored = JSON.parse(raw) as StoredPin;
    if ((await hashPin(pin, stored.salt)) === stored.hash) {
      failedAttempts = 0;
      return { ok: true };
    }
    failedAttempts += 1;
    if (failedAttempts >= MAX_ATTEMPTS) {
      failedAttempts = 0;
      lockedOutUntil = Date.now() + LOCKOUT_MS;
      return { ok: false, attemptsLeft: 0, lockedForMs: LOCKOUT_MS };
    }
    return { ok: false, attemptsLeft: MAX_ATTEMPTS - failedAttempts, lockedForMs: 0 };
  },

  lockoutRemainingMs(): number {
    return Math.max(0, lockedOutUntil - Date.now());
  },

  /** Which biometric the device offers and has enrolled, or 'none'. */
  async biometricKind(): Promise<BiometricKind> {
    try {
      const [hasHardware, enrolled] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!hasHardware || !enrolled) return 'none';
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
      return 'none';
    } catch {
      return 'none';
    }
  },

  /** Shows the system biometric prompt. Resolves false on cancel or failure. */
  async authenticateBiometric(promptMessage: string): Promise<boolean> {
    return lockService.withoutAutoLock(async () => {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage,
          cancelLabel: 'Use PIN',
          // The app's own PIN is the fallback, not the device passcode.
          disableDeviceFallback: true,
        });
        return result.success;
      } catch {
        return false;
      }
    });
  },

  /** Runs `task` (e.g. opening the camera) without the app re-locking when it comes back. */
  async withoutAutoLock<T>(task: () => Promise<T>): Promise<T> {
    autoLockSuspensions += 1;
    try {
      return await task();
    } finally {
      // Let the "app became active" event for this return pass before re-enabling.
      setTimeout(() => {
        autoLockSuspensions = Math.max(0, autoLockSuspensions - 1);
      }, 1000);
    }
  },

  isAutoLockSuspended(): boolean {
    return autoLockSuspensions > 0;
  },
};
