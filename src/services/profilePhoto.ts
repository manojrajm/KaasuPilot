import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

import { profileRepo } from '@/data/repositories/profileRepo';
import { lockService } from './lock';

async function saveAvatar(sourceUri: string): Promise<string> {
  const profileDir = new Directory(Paths.document, 'profile');
  if (!profileDir.exists) {
    profileDir.create();
  }

  // Delete previous avatar file if present
  const profile = await profileRepo.getProfile();
  if (profile.photoUri) {
    try {
      const oldFile = new File(profile.photoUri);
      if (oldFile.exists) oldFile.delete();
    } catch {
      // Ignore if already gone
    }
  }

  const filename = `avatar-${Date.now()}.jpg`;
  const destFile = new File(profileDir, filename);

  const sourceFile = new File(sourceUri);
  await sourceFile.copy(destFile);

  await profileRepo.updateProfile({ photoUri: destFile.uri });
  return destFile.uri;
}

export const profilePhotoService = {
  /** Opens gallery to select and crop a 1:1 avatar photo. */
  async pickFromGallery(): Promise<string | null> {
    return lockService.withoutAutoLock(async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access photos is needed to set a profile picture.');
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return null;
      return saveAvatar(result.assets[0].uri);
    });
  },

  /** Opens camera to capture and crop a 1:1 avatar photo. */
  async takePhoto(): Promise<string | null> {
    return lockService.withoutAutoLock(async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is needed to take a profile picture.');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) return null;
      return saveAvatar(result.assets[0].uri);
    });
  },

  /** Deletes the on-device avatar file and resets photoUri in the profile. */
  async removePhoto(): Promise<void> {
    const profile = await profileRepo.getProfile();
    if (profile.photoUri) {
      try {
        const file = new File(profile.photoUri);
        if (file.exists) file.delete();
      } catch (err) {
        console.warn('Could not delete avatar file', err);
      }
    }
    await profileRepo.updateProfile({ photoUri: null });
  },
};