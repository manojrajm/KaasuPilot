import { useCallback, useEffect, useState } from 'react';

import { profileRepo } from '@/data/repositories/profileRepo';
import {
  DEFAULT_EXPERIENCE,
  DEFAULT_PROFILE,
  DEFAULT_SECURITY,
  ExperienceSettings,
  SecuritySettings,
  UserProfile,
} from '@/domain/profile/types';
import { Account } from '@/domain/types';
import { lockService } from '@/services/lock';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY);
  const [experience, setExperience] = useState<ExperienceSettings>(DEFAULT_EXPERIENCE);
  const [cards, setCards] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [p, s, e, c] = await Promise.all([
          profileRepo.getProfile(),
          profileRepo.getSecuritySettings(),
          profileRepo.getExperienceSettings(),
          profileRepo.getCards(),
        ]);
        if (active) {
          setProfile(p);
          setSecurity(s);
          setExperience(e);
          setCards(c);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load profile telemetry', err);
        if (active) setLoading(false);
      }
    };

    loadData();
    const unsubscribe = profileRepo.subscribe(loadData);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const updated = await profileRepo.updateProfile(patch);
    setProfile(updated);
    return updated;
  }, []);

  const toggleBiometric = useCallback(
    async (ensurePin?: () => Promise<boolean>) => {
      const turningOn = !security.biometricLockEnabled;
      if (turningOn && ensurePin) {
        const hasPin = await lockService.hasPin();
        if (!hasPin) {
          const pinSet = await ensurePin();
          if (!pinSet) return;
        }
      }
      const updated = await profileRepo.updateSecuritySettings({
        biometricLockEnabled: turningOn,
      });
      setSecurity(updated);
    },
    [security.biometricLockEnabled]
  );

  const togglePrivacyCurtain = useCallback(async () => {
    const updated = await profileRepo.updateSecuritySettings({
      privacyCurtainEnabled: !security.privacyCurtainEnabled,
    });
    setSecurity(updated);
  }, [security.privacyCurtainEnabled]);

  const setAutoLockDuration = useCallback(async (duration: 'immediate' | '1m' | '5m') => {
    const updated = await profileRepo.updateSecuritySettings({
      autoLockDuration: duration,
    });
    setSecurity(updated);
  }, []);

  const toggleHaptics = useCallback(async () => {
    const updated = await profileRepo.updateExperienceSettings({
      hapticsEnabled: !experience.hapticsEnabled,
    });
    setExperience(updated);
  }, [experience.hapticsEnabled]);

  const toggleVideoReactions = useCallback(async () => {
    const updated = await profileRepo.updateExperienceSettings({
      videoReactionsEnabled: !experience.videoReactionsEnabled,
    });
    setExperience(updated);
  }, [experience.videoReactionsEnabled]);

  const toggleThreeVault = useCallback(async () => {
    const updated = await profileRepo.updateExperienceSettings({
      threeVaultEnabled: !experience.threeVaultEnabled,
    });
    setExperience(updated);
  }, [experience.threeVaultEnabled]);

  const exportBackup = useCallback(async () => {
    return await profileRepo.exportEncryptedBackup();
  }, []);

  const exportCsv = useCallback(async () => {
    return await profileRepo.exportCsv();
  }, []);

  const factoryReset = useCallback(async () => {
    return await profileRepo.factoryResetVault();
  }, []);

  return {
    profile,
    security,
    experience,
    cards,
    loading,
    updateProfile,
    toggleBiometric,
    togglePrivacyCurtain,
    setAutoLockDuration,
    toggleHaptics,
    toggleVideoReactions,
    toggleThreeVault,
    exportBackup,
    exportCsv,
    factoryReset,
  };
}