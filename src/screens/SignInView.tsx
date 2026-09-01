import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Images } from '@/constants/assets';
import { colors, font, s } from '@/theme';
import { useScreenTracking } from '@/services/Analytics';
import { AppImage, AppImageBackground } from '@/components/AppImage';
import { PressScale } from '@/components/motion';
import { Spinner } from '@/components/Spinner';

/**
 * iOS `SignInView`. The Apple button is the one requested omission, so only the
 * Google button ships here.
 *
 * While the flow is running iOS keeps this screen up and shows the spinner INSIDE
 * the pressed button (`loadingProvider == .google`), hiding the label and the
 * Google mark and disabling the button — it never swaps to the full-screen
 * `LoadingScreen`. That only appears afterwards, while the household loads.
 */
export function SignInView({ onGoogle, loading = false }: { onGoogle(): void; loading?: boolean }) {
  useScreenTracking('SignIn');
  return (
    <AppImageBackground source={Images.signInBg} resizeMode="stretch" style={styles.root}>
      {/* iOS overlays a 301-tall purple wash from the top edge. */}
      <LinearGradient colors={[`${colors.purple}33`, `${colors.purple}00`]} style={styles.wash} pointerEvents="none" />
      <View style={styles.actions}>
        <PressScale onPress={onGoogle} disabled={loading} style={styles.google}>
          <AppImage source={Images.googleLogo} style={[styles.logo, loading && styles.hidden]} />
          <Text style={[styles.googleText, loading && styles.hidden]}>Sign in with Google</Text>
          {loading && <Spinner size={s(20)} color="#000000" style={styles.spinner} />}
        </PressScale>
      </View>
    </AppImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: s(301) },
  actions: { position: 'absolute', left: s(25), right: s(25), bottom: s(68), gap: s(12) },
  google: {
    alignSelf: 'stretch',
    height: s(52),
    borderRadius: s(100),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    // iOS pairs a 1pt white highlight above the button with a soft black drop
    // shadow; RN's `boxShadow` takes CSS blur, which is ~2x a SwiftUI radius.
    boxShadow: [
      { offsetX: 0, offsetY: s(-1), blurRadius: 0, color: 'rgba(255,255,255,0.25)' },
      { offsetX: 0, offsetY: s(2), blurRadius: s(10), color: 'rgba(0,0,0,0.2)' },
    ],
  },
  logo: { position: 'absolute', left: s(13), width: s(22), height: s(22) },
  googleText: { ...font('medium', 20), lineHeight: s(23.9), includeFontPadding: false, color: '#000' },
  spinner: { position: 'absolute' },
  hidden: { opacity: 0 },
});
