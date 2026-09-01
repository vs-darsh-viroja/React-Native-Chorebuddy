import React, { useEffect } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Images } from '@/constants/assets';
import { BlinkingBunny, CapsuleCTA, SoftGlow } from '@/components/motion';
import { AppConstant } from '@/constants/AppConstant';
import { Analytics } from '@/services/Analytics';
import { colors, font, s } from '@/theme';
import { AppImage } from '@/components/AppImage';
import { Spinner } from '@/components/Spinner';

/**
 * iOS `ForceUpdateAlertView`: a blocking screen with the blinking bunny over a
 * purple glow and an Update Now button. iOS opens the App Store; Android opens
 * the Play listing.
 */
export function ForceUpdateView() {
  useEffect(() => { Analytics.log('force_update_shown'); }, []);
  return (
    <View style={styles.root}>
      <View style={styles.stack}>
        <View style={styles.mascot}>
          <SoftGlow color={colors.purple} opacity={0.12} style={styles.glow} />
          <BlinkingBunny />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Update Required</Text>
          <Text style={styles.message}>A new version of ChoreBuddy is available. Please update to keep your chores in sync.</Text>
        </View>
        <CapsuleCTA
          label="Update Now"
          width={260}
          onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); Analytics.log('force_update_tapped'); void Linking.openURL(AppConstant.appStoreURL).catch(() => Linking.openURL(AppConstant.shareAppIDURL)); }}
        />
      </View>
    </View>
  );
}

/**
 * iOS `LoadingScreen`: the splash artwork (`scaledToFill`) with a purple circular
 * `ProgressView` s(80) above the bottom edge.
 *
 * The artwork needs EXPLICIT dimensions. On Fabric an Image sized only by
 * `StyleSheet.absoluteFill` falls back to its intrinsic size, and
 * `Splash_screen.png` is 1125x2436 with no `@3x` suffix — so it rendered
 * 1125x2436 **dp**, a ~2.6x magnified crop of the artwork's top-left corner at
 * density 2.5, which is why the app icon and wordmark were nowhere on screen and
 * the whole gate looked like a blank pink page.
 */
export function LoadingScreen() {
  return (
    <View style={[styles.root, styles.splashRoot]}>
      <AppImage source={Images.Splash_screen} resizeMode="cover" style={styles.splash} />
      <View style={styles.spinner}>
        <Spinner size={s(20)} color={colors.purple} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  stack: { alignItems: 'center', gap: s(24), paddingHorizontal: s(24) },
  mascot: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  copy: { gap: s(10), alignItems: 'center' },
  title: { ...font('semibold', 22), color: colors.text },
  message: { ...font('regular', 15), color: `${colors.text}99`, textAlign: 'center', width: s(280) },
  // The native launch window paints the same artwork over #FED6DC
  // (plugins/withLaunchScreenFill.js); matching it here means a slow bitmap
  // decode can never flash the pale app background between the two.
  splashRoot: { backgroundColor: '#FED6DC' },
  splash: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  spinner: { position: 'absolute', left: 0, right: 0, bottom: s(80), alignItems: 'center' },
});
