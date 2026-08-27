import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { colors } from '@/theme';

/**
 * Port of iOS `SafariView`. iOS presents policy and support pages inside the app
 * with `SFSafariViewController` rather than throwing the user out to Safari;
 * Android Custom Tabs is the direct equivalent. Falls back to the system browser
 * when no Custom Tabs provider is installed.
 */
export async function openInAppBrowser(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url, { toolbarColor: colors.background, controlsColor: colors.purple });
  } catch {
    await Linking.openURL(url).catch(() => undefined);
  }
}
