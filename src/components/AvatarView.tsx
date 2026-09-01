import React from 'react';
import { Alert, Linking, type ImageStyle, type StyleProp } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { avatarSource } from '@/screens/household/HouseholdUI';
import { AppImage } from '@/components/AppImage';

/**
 * iOS `AvatarView`: the member's photo when one is stored, otherwise their
 * chosen avatar asset. Every avatar in the app goes through here so the
 * base64 → data-URI handling lives in exactly one place.
 */
export function AvatarView({ avatar, photoData, size, style }: { avatar: string; photoData?: string | null; size: number; style?: StyleProp<ImageStyle> }) {
  const source = photoData ? { uri: photoData.startsWith('data:') ? photoData : `data:image/jpeg;base64,${photoData}` } : avatarSource(avatar);
  return <AppImage source={source} resizeMode="cover" style={[{ width: size, height: size, borderRadius: size / 2 }, style]} />;
}

const MAX_DIMENSION = 512;
const MAX_BYTES = 300_000;

/**
 * iOS `AvatarPhoto.encode`: downscale to 512px on the long edge, then step the
 * JPEG quality down from 0.7 until the payload fits ~300KB. The cap matters
 * because the encoded string is stored inside the member document, and
 * Firestore rejects documents over 1MB.
 */
export async function encodeAvatarPhoto(uri: string, width: number, height: number): Promise<string | null> {
  const longest = Math.max(width, height);
  const resize = longest > MAX_DIMENSION
    ? [{ resize: width >= height ? { width: MAX_DIMENSION } : { height: MAX_DIMENSION } }]
    : [];
  let quality = 0.7;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const result = await ImageManipulator.manipulateAsync(uri, resize, { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    const encoded = result.base64;
    if (!encoded) return null;
    // base64 inflates bytes by 4/3; compare against the decoded size like iOS does.
    if (encoded.length * 0.75 <= MAX_BYTES || quality <= 0.15) return encoded;
    quality -= 0.1;
  }
  return null;
}

/** iOS `cameraSettingsAlert` / photo-access alert, shared by both pickers. */
function accessDeniedAlert(camera: boolean) {
  Alert.alert(
    camera ? 'Camera Access Disabled' : 'Photo Access Disabled',
    camera
      ? 'Camera access is turned off for ChoreBuddy. Enable it in Settings to take a photo.'
      : 'Photo access is turned off for ChoreBuddy. Enable it in Settings to choose a photo.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => void Linking.openSettings() }],
  );
}

/** iOS `PhotosPicker(maxSelectionCount: 10)` — the chore-photo cap on both screens. */
export const MAX_CHORE_PHOTOS = 10;

/**
 * iOS chore photos come from
 * `PhotosPicker(selection: $photoItems, maxSelectionCount: 10, matching: .images)`
 * — a MULTI-select picker with no cropping stage. Android was reusing
 * `pickAvatarPhoto`, which is the single-image square-crop picker, so a chore
 * could only ever gain one photo per tap and each one was cropped.
 *
 * `limit` is how many more photos will fit under `MAX_CHORE_PHOTOS`, so the system
 * picker enforces the remaining budget itself rather than silently discarding the
 * overflow after the user picked it.
 *
 * `allowsEditing` is deliberately absent: it is mutually exclusive with
 * `allowsMultipleSelection`, and iOS's picker does not crop either.
 */
export async function pickChorePhotos(limit: number): Promise<string[]> {
  if (limit <= 0) return [];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) { accessDeniedAlert(false); return []; }
  const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, selectionLimit: limit, quality: 1 });
  if (result.canceled) return [];
  const encoded: string[] = [];
  for (const asset of result.assets.slice(0, limit)) {
    const data = await encodeAvatarPhoto(asset.uri, asset.width, asset.height);
    if (data) encoded.push(data);
  }
  if (!encoded.length) { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return []; }
  void Haptics.selectionAsync();
  return encoded;
}

/**
 * iOS `CameraImagePicker` / `GalleryImagePicker` plus `cameraSettingsAlert`:
 * pick a square image and return it already encoded for `members.photoData`.
 */
export async function pickAvatarPhoto(camera: boolean): Promise<string | null> {
  const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) { accessDeniedAlert(camera); return null; }
  const options: ImagePicker.ImagePickerOptions = { allowsEditing: true, aspect: [1, 1], quality: 1 };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const encoded = await encodeAvatarPhoto(asset.uri, asset.width, asset.height);
  if (!encoded) { void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return null; }
  void Haptics.selectionAsync();
  return encoded;
}
