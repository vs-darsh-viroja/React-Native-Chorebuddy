import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * iOS `adminOnlyAlert(isPresented:message:)` — the single "Admin Only" alert
 * used whenever a non-admin taps a management control. iOS pairs it with an
 * error haptic at every call site, so that lives here too.
 */
export function adminOnlyAlert(message = 'Only the household admin can manage this.') {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  Alert.alert('Admin Only', message);
}

export const ADMIN_ONLY_ZONES = 'Only the household admin can edit or delete zones.';
export const ADMIN_ONLY_MEMBERS = 'Only the household admin can add, edit, or remove members.';
export const ADMIN_ONLY_OWN_PROFILE = 'You can only edit or delete your own profile.';
