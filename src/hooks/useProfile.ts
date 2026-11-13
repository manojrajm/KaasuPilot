import { useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  SecuritySettings,
  ExperienceSettings,
  ConnectedCard,
} from '@/domain/profile/types';
import { profileRepo } from '@/data/repositories/profileRepo';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Aravind',
    callSign: 'Cyber Pilot',
    tier: 'OBSIDIAN FOUNDER • LOCAL PILOT #001',
    monthlyIncomePaise: 6200000,
    salaryDayOfMonth: 1,
    currencyFormat: 'inr_lakhs',
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    biometricLockEnabled: true,
    autoLockDuration: 'immediate',
    privacyCurtainEnabled: true,
  });

  const [experience, setExperience] = useState<ExperienceSettings>({
    hapticsEnabled: true,
    videoReactionsEnabled: true,
    threeVaultEnabled: true,
  });

  const [cards, setCards] = useState<ConnectedCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [p, s, e, c] = await Promise.all([
      profileRepo.getProfile(),
      profileRepo.getSecuritySettings(),
      profileRepo.getExperienceSettings(),
      profileRepo.getCards(),
    ]);
    setProfile(p);
    setSecurity(s);
    setExperience(e);
    setCards(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = profileRepo.subscribe(() => {
      loadData();
    });
    return unsubscribe;
  }, [loadData]);

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    const updated = await profileRepo.updateProfile(patch);
    setProfile(updated);
  }, []);

  const toggleBiometric = useCallback(async () => {
    const updated = await profileRepo.updateSecuritySettings({
      biometricLockEnabled: !security.biometricLockEnabled,
    });
    setSecurity(updated);
  }, [security.biometricLockEnabled]);

  const togglePrivacyCurtain = useCallback(async () => {
    const updated = await profileRepo.updateSecuritySettings({
      privacyCurtainEnabled: !security.privacyCurtainEnabled,
    });
    setSecurity(updated);
  }, [security.privacyCurtainEnabled]);

  const setAutoLockDuration = useCallback(
    async (duration: 'immediate' | '1m' | '5m') => {
      const updated = await profileRepo.updateSecuritySettings({
        autoLockDuration: duration,
      });
      setSecurity(updated);
    },
    []
  );

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
