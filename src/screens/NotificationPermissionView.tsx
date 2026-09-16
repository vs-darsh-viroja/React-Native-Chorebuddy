import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Images } from '@/constants/assets';
import { colors, font, isPad, s, sf } from '@/theme';
import { useScreenTracking } from '@/services/Analytics';
import { AppImage } from '@/components/AppImage';

/**
 * iOS constrains the reminder artwork by WIDTH only —
 * `.scaledToFit().frame(maxWidth: isIPad ? 500 : 333)` — so its height falls out
 * of the asset's own aspect ratio (`NotificationPermissionView.swift:38-42`).
 *
 * The port had invented `height: s(260)`. `iphoneReminerImg` is 999x246, i.e.
 * aspect 4.06, so at 333 wide the art is only 82 design units tall and the other
 * **178 units were empty box** — which is the whole reason the Enable/No Thanks
 * buttons ended up below the bottom edge on a short screen. Resolved from the
 * asset rather than hardcoded, so it cannot drift if the artwork is replaced.
 */
const ART = Image.resolveAssetSource(isPad ? Images.ipadReminderImg : Images.iphoneReminerImg);
const ART_WIDTH = isPad ? 500 : 333;

export function NotificationPermissionView({ onFinish }: { onFinish(): void }) {
  useScreenTracking('NotificationPermission');
  const insets = useSafeAreaInsets();
  const [requesting, setRequesting] = useState(false);
  const enable = async () => { setRequesting(true); await Notifications.requestPermissionsAsync(); setRequesting(false); onFinish(); };
  return (
    <View style={styles.root}>
      {/*
        The background is a sibling of the padded content, NOT a child of it: as an
        absolute child of the padded view its `100%` resolved against the PADDING
        BOX, so it rendered 50 design units narrower than the window and stopped
        short of the right edge with a visible vertical seam. `stretch` matches
        iOS's `.resizable()` with no aspect ratio, which fills rather than crops.
      */}
      <AppImage source={Images.appBg} resizeMode="stretch" style={styles.bg} />
      <View style={[styles.content, { paddingTop: Math.max(s(55), insets.top + s(16)), paddingBottom: Math.max(s(40), insets.bottom + s(16)) }]}>
        <Text style={styles.title}>Never Forget Your Chores Again</Text>
        <View style={styles.lines}>
          <Text style={styles.line}>Get notified when you don't complete your chores on time.</Text>
          <Text style={styles.line}>Chore reminders are optional and can be configured individually.</Text>
          <Text style={styles.line}>We don't use notifications for marketing.</Text>
        </View>
        <AppImage source={isPad ? Images.ipadReminderImg : Images.iphoneReminerImg} resizeMode="contain" style={styles.reminder} />
        <View style={styles.flex} />
        <View style={styles.actions}>
          <Pressable disabled={requesting} onPress={() => { void enable(); }} style={styles.primary}><Text style={styles.primaryText}>Enable Notification</Text></Pressable>
          <Pressable disabled={requesting} onPress={onFinish} style={styles.secondary}><Text style={styles.secondaryText}>No Thanks</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  bg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: s(25) },
  /**
   * Line boxes pinned to SF Pro Rounded's real metrics with
   * `includeFontPadding: false` — the standing Android rule, and load-bearing
   * here for the same reason as the artwork above: Android reserves the font's
   * 1.8472 em glyph bounding box on a paragraph's first and last line, which
   * added 22 units to the 34pt title and 35 across the three 18pt paragraphs.
   * The title's `lineHeight` carries iOS's `.lineSpacing(4)` on top of the
   * 1.1934 em box, so the two-line rhythm matches `NotificationPermissionView.swift:22-27`.
   */
  title: { ...font('semibold', 34), lineHeight: sf(34 * 1.1934 + 4), includeFontPadding: false, color: colors.text, width: s(280), textAlign: 'center' },
  lines: { width: s(320), gap: s(15), marginTop: s(45) },
  line: { ...font('regular', 18), lineHeight: sf(21.48), includeFontPadding: false, color: colors.text },
  reminder: { width: s(ART_WIDTH), height: s((ART_WIDTH * ART.height) / ART.width), marginTop: s(34) },
  /** iOS `Spacer(minLength: 20)`. */
  flex: { flex: 1, minHeight: s(20) },
  actions: { width: '100%', gap: s(15) },
  primary: { height: s(52), borderRadius: s(26), backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  primaryText: { ...font('semibold', 16), lineHeight: sf(19.09), includeFontPadding: false, color: 'white' },
  secondary: { height: s(52), borderRadius: s(26), borderWidth: 1, borderColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...font('semibold', 16), lineHeight: sf(19.09), includeFontPadding: false, color: colors.text },
});
